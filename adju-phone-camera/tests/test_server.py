import asyncio
from pathlib import Path
from types import SimpleNamespace

from fastapi import WebSocketDisconnect

from adju_phone_camera.server import CameraServer


WEB_ROOT = Path(__file__).parents[1] / "adju_phone_camera" / "web"


def make_server():
    return CameraServer("123456", WEB_ROOT, lambda _image: None, lambda _status: None)


class FakeWebSocket:
    def __init__(self, messages):
        self.client = SimpleNamespace(host="192.168.1.10")
        self.messages = iter(messages)
        self.responses = []

    async def accept(self):
        pass

    async def receive_json(self):
        try:
            return next(self.messages)
        except StopIteration:
            raise WebSocketDisconnect(code=1000)

    async def send_json(self, message):
        self.responses.append(message)


def test_phone_page_and_stylesheet_are_served():
    app = make_server().app
    home_route = next(route for route in app.routes if getattr(route, "path", None) == "/")
    page = asyncio.run(home_route.endpoint())
    static_mount = next(route for route in app.routes if getattr(route, "path", None) == "/static")

    assert Path(page.path).read_text(encoding="utf-8").find("ADJU PHONE CAMERA") >= 0
    assert (WEB_ROOT / "style.css").is_file()
    assert static_mount.name == "static"


def test_signaling_requires_pin_and_can_stop_after_pairing():
    app = make_server().app
    endpoint = next(route.endpoint for route in app.routes if getattr(route, "path", None) == "/ws")
    websocket = FakeWebSocket(
        [
            {"type": "offer", "sdp": "ignored"},
            {"type": "pair", "pin": "123456"},
            {"type": "stop"},
        ]
    )

    asyncio.run(endpoint(websocket))

    assert [response["type"] for response in websocket.responses] == ["error", "paired", "stopped"]
