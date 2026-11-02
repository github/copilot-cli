"""Local HTTP/WebSocket signaling and direct WebRTC video receiving."""

from __future__ import annotations

import asyncio
import hmac
import logging
import socket
import threading
from pathlib import Path
from typing import Callable

import uvicorn
from aiortc import RTCPeerConnection, RTCSessionDescription, RTCConfiguration
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image

from .pairing import PinAttemptLimiter, is_valid_pin

LOGGER = logging.getLogger(__name__)


def get_lan_ip() -> str:
    """Find a private IPv4 address without sending packets to the internet."""
    try:
        addresses = socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET)
    except OSError:
        addresses = []
    for address in addresses:
        ip = address[4][0]
        octets = ip.split(".")
        if len(octets) != 4:
            continue
        first, second = int(octets[0]), int(octets[1])
        if first == 10 or (first == 172 and 16 <= second <= 31) or (first == 192 and second == 168):
            return ip
    return "127.0.0.1"


class CameraServer:
    """Owns the local signaling server and one paired phone connection."""

    def __init__(
        self,
        pin: str,
        web_root: Path,
        on_frame: Callable[[Image.Image], None],
        on_status: Callable[[str], None],
    ) -> None:
        if not is_valid_pin(pin):
            raise ValueError("The pairing PIN must contain exactly six digits.")
        self.pin = pin
        self.web_root = web_root
        self.on_frame = on_frame
        self.on_status = on_status
        self.app = FastAPI(openapi_url=None, docs_url=None, redoc_url=None)
        self._limiter = PinAttemptLimiter()
        self._peer_connection: RTCPeerConnection | None = None
        self._paired_socket: WebSocket | None = None
        self._loop: asyncio.AbstractEventLoop | None = None
        self._thread: threading.Thread | None = None
        self._server: uvicorn.Server | None = None
        self.app.mount("/static", StaticFiles(directory=self.web_root), name="static")
        self._register_routes()

    @property
    def is_alive(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    @property
    def is_ready(self) -> bool:
        return self._server is not None and self._server.started

    def _register_routes(self) -> None:
        @self.app.get("/")
        async def home() -> FileResponse:
            return FileResponse(self.web_root / "index.html")

        @self.app.get("/health")
        async def health() -> dict[str, str]:
            return {"status": "ok"}

        @self.app.websocket("/ws")
        async def signaling(websocket: WebSocket) -> None:
            address = websocket.client.host if websocket.client else "unknown"
            await websocket.accept()
            paired = False
            try:
                while True:
                    message = await websocket.receive_json()
                    if not isinstance(message, dict):
                        await websocket.send_json({"type": "error", "message": "Invalid message."})
                        continue

                    message_type = message.get("type")
                    if not paired:
                        if message_type != "pair":
                            await websocket.send_json({"type": "error", "message": "Enter the pairing PIN first."})
                            continue
                        if self._limiter.is_blocked(address):
                            await websocket.send_json(
                                {"type": "error", "message": "Too many incorrect PIN attempts. Wait one minute."}
                            )
                            continue
                        supplied_pin = message.get("pin")
                        if not is_valid_pin(supplied_pin) or not hmac.compare_digest(self.pin, supplied_pin):
                            self._limiter.record_failure(address)
                            await websocket.send_json({"type": "error", "message": "Incorrect pairing PIN."})
                            continue
                        self._limiter.record_success(address)
                        if self._paired_socket is not None and self._paired_socket is not websocket:
                            await websocket.send_json(
                                {"type": "error", "message": "Another phone is already paired."}
                            )
                            continue
                        self._paired_socket = websocket
                        paired = True
                        self.on_status("Phone paired")
                        await websocket.send_json({"type": "paired"})
                        continue

                    if message_type == "offer":
                        await self._accept_offer(websocket, message)
                    elif message_type == "stop":
                        await self._close_peer()
                        self.on_status("Phone paired — camera stopped")
                        await websocket.send_json({"type": "stopped"})
                    else:
                        await websocket.send_json({"type": "error", "message": "Unsupported signaling message."})
            except WebSocketDisconnect:
                pass
            except (ValueError, KeyError) as error:
                LOGGER.info("Rejected signaling message from %s: %s", address, error)
                try:
                    await websocket.send_json({"type": "error", "message": "Invalid WebRTC offer."})
                except RuntimeError:
                    pass
            except Exception:
                LOGGER.exception("Phone signaling connection failed")
                try:
                    await websocket.send_json(
                        {"type": "error", "message": "Connection error. Reconnect and try again."}
                    )
                except RuntimeError:
                    pass
            finally:
                if self._paired_socket is websocket:
                    self._paired_socket = None
                    await self._close_peer()
                    self.on_status("Waiting for phone")

    async def _accept_offer(self, websocket: WebSocket, message: dict[str, object]) -> None:
        sdp = message.get("sdp")
        if not isinstance(sdp, str) or len(sdp) > 2_000_000:
            raise ValueError("Invalid SDP.")
        await self._close_peer()
        peer = RTCPeerConnection(configuration=RTCConfiguration(iceServers=[]))
        self._peer_connection = peer

        @peer.on("track")
        async def on_track(track) -> None:
            if track.kind != "video":
                return
            self.on_status("Receiving video")
            try:
                while True:
                    frame = await track.recv()
                    image = frame.to_image().convert("RGB")
                    self.on_frame(image)
            except Exception:
                LOGGER.info("Phone video track ended")

        @peer.on("connectionstatechange")
        async def on_connection_state_change() -> None:
            state = peer.connectionState
            if state == "connected":
                self.on_status("Receiving video")
            elif state in ("failed", "closed", "disconnected"):
                self.on_status(f"WebRTC {state}")

        await peer.setRemoteDescription(RTCSessionDescription(sdp=sdp, type="offer"))
        answer = await peer.createAnswer()
        await peer.setLocalDescription(answer)
        await websocket.send_json({"type": "answer", "sdp": peer.localDescription.sdp})

    async def _close_peer(self) -> None:
        peer = self._peer_connection
        self._peer_connection = None
        if peer is not None:
            await peer.close()

    def start(
        self,
        host: str,
        port: int,
        tls_cert: Path | None = None,
        tls_key: Path | None = None,
    ) -> None:
        if (tls_cert is None) != (tls_key is None):
            raise ValueError("Both a TLS certificate and private key are required.")
        if self._thread is not None and self._thread.is_alive():
            return

        config = uvicorn.Config(
            self.app,
            host=host,
            port=port,
            log_level="warning",
            log_config=None,
            ssl_certfile=str(tls_cert) if tls_cert else None,
            ssl_keyfile=str(tls_key) if tls_key else None,
        )
        server = uvicorn.Server(config)
        self._server = server

        def serve() -> None:
            self._loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self._loop)
            try:
                self._loop.run_until_complete(server.serve())
            except Exception:
                LOGGER.exception("Local camera server failed")
                self.on_status("Server error — check port and TLS files")
            finally:
                self._loop.close()
                self._loop = None

        self._thread = threading.Thread(target=serve, name="adju-camera-server", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        server = self._server
        if server is not None:
            server.should_exit = True
        thread = self._thread
        if thread is not None and thread.is_alive():
            thread.join(timeout=5)
        self._thread = None
        self._server = None
