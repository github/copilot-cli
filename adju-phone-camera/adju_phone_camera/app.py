"""CustomTkinter interface for ADJU PHONE CAMERA."""

from __future__ import annotations

import threading
import time
from pathlib import Path
from tkinter import filedialog, messagebox

import customtkinter as ctk
import qrcode
from PIL import Image, ImageTk

from .pairing import generate_pairing_pin
from .server import CameraServer, get_lan_ip


class CameraApp(ctk.CTk):
    def __init__(
        self,
        port: int = 8765,
        tls_cert: Path | None = None,
        tls_key: Path | None = None,
    ) -> None:
        super().__init__()
        self.title("ADJU PHONE CAMERA")
        self.geometry("1080x760")
        self.minsize(820, 620)
        ctk.set_appearance_mode("dark")
        ctk.set_default_color_theme("blue")

        self.port = port
        self.tls_cert = tls_cert
        self.tls_key = tls_key
        self.pin = generate_pairing_pin()
        self._image_lock = threading.Lock()
        self._latest_frame: Image.Image | None = None
        self._frame_revision = 0
        self._rendered_revision = -1
        self._frame_count = 0
        self._fps = 0
        self._fps_started = time.monotonic()
        self._running = False
        self._fullscreen = False
        self._preview_photo: ImageTk.PhotoImage | None = None
        self._server = CameraServer(
            self.pin,
            self._web_root(),
            self._receive_frame,
            self._set_status_from_server,
        )

        self._build_ui()
        self._refresh_access_link()
        self.protocol("WM_DELETE_WINDOW", self._close)
        self.bind("<Escape>", lambda _event: self._toggle_fullscreen(False))
        self.after(30, self._update_preview)

    @staticmethod
    def _web_root() -> Path:
        import sys

        bundle_root = getattr(sys, "_MEIPASS", None)
        if bundle_root:
            return Path(bundle_root) / "adju_phone_camera" / "web"
        return Path(__file__).resolve().parent / "web"

    def _build_ui(self) -> None:
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(2, weight=1)

        header = ctk.CTkFrame(self, corner_radius=14)
        header.grid(row=0, column=0, padx=20, pady=(20, 12), sticky="ew")
        header.grid_columnconfigure(0, weight=1)
        ctk.CTkLabel(header, text="ADJU PHONE CAMERA", font=ctk.CTkFont(size=24, weight="bold")).grid(
            row=0, column=0, padx=20, pady=(16, 2), sticky="w"
        )
        ctk.CTkLabel(
            header,
            text="Use your phone as a camera over your local Wi-Fi — video stays on your network.",
            text_color=("gray35", "gray75"),
        ).grid(row=1, column=0, padx=20, pady=(0, 16), sticky="w")
        self.status_label = ctk.CTkLabel(header, text="Stopped", text_color="#f0ad4e")
        self.status_label.grid(row=0, column=1, rowspan=2, padx=20)

        controls = ctk.CTkFrame(self, corner_radius=14)
        controls.grid(row=1, column=0, padx=20, pady=8, sticky="ew")
        controls.grid_columnconfigure(1, weight=1)
        self.start_button = ctk.CTkButton(controls, text="Start server", command=self._start_server)
        self.start_button.grid(row=0, column=0, padx=(16, 10), pady=16)
        self.stop_button = ctk.CTkButton(
            controls, text="Stop server", command=self._stop_server, state="disabled", fg_color="#7d3434"
        )
        self.stop_button.grid(row=0, column=1, padx=8, pady=16, sticky="w")
        self.quality_menu = ctk.CTkOptionMenu(
            controls,
            values=["480p", "720p", "1080p"],
            command=self._quality_changed,
        )
        self.quality_menu.set("720p")
        self.quality_menu.grid(row=0, column=2, padx=(8, 16), pady=16)

        body = ctk.CTkFrame(self, corner_radius=14)
        body.grid(row=2, column=0, padx=20, pady=8, sticky="nsew")
        body.grid_columnconfigure(0, weight=1)
        body.grid_rowconfigure(0, weight=1)

        self.preview = ctk.CTkLabel(
            body,
            text="Start the server, scan the QR code, then pair and start the camera on your phone.",
            justify="center",
            font=ctk.CTkFont(size=16),
        )
        self.preview.grid(row=0, column=0, padx=16, pady=16, sticky="nsew")
        self.preview.bind("<Double-Button-1>", lambda _event: self._toggle_fullscreen())

        pairing = ctk.CTkFrame(body, width=250)
        pairing.grid(row=0, column=1, padx=(0, 16), pady=16, sticky="ns")
        pairing.grid_propagate(False)
        ctk.CTkLabel(pairing, text="PAIR YOUR PHONE", font=ctk.CTkFont(weight="bold")).pack(pady=(18, 8))
        self.qr_label = ctk.CTkLabel(pairing, text="QR will appear here")
        self.qr_label.pack(padx=16, pady=8)
        self.pin_label = ctk.CTkLabel(pairing, text=f"PIN  {self.pin}", font=ctk.CTkFont(size=22, weight="bold"))
        self.pin_label.pack(pady=8)
        self.url_label = ctk.CTkLabel(pairing, text="Server is stopped", wraplength=220, justify="center")
        self.url_label.pack(padx=14, pady=8)
        self.fps_label = ctk.CTkLabel(pairing, text="0 FPS")
        self.fps_label.pack(pady=(8, 2))
        ctk.CTkButton(pairing, text="Save screenshot", command=self._save_screenshot).pack(
            padx=14, pady=8, fill="x"
        )
        ctk.CTkButton(pairing, text="Fullscreen preview", command=self._toggle_fullscreen).pack(
            padx=14, pady=(0, 16), fill="x"
        )

        ctk.CTkLabel(
            self,
            text="Phone camera access requires HTTPS with a trusted certificate on the phone. See project README.",
            text_color=("#8b5a00", "#f0c36d"),
        ).grid(row=3, column=0, padx=22, pady=(2, 14), sticky="w")

    def _refresh_access_link(self) -> None:
        scheme = "https" if self.tls_cert else "http"
        selected_resolution = self.quality_menu.get().removesuffix("p")
        self._url = f"{scheme}://{get_lan_ip()}:{self.port}/?resolution={selected_resolution}"
        self.url_label.configure(text=self._url)
        qr = qrcode.make(self._url).convert("RGB")
        self._qr_photo = ctk.CTkImage(light_image=qr, dark_image=qr, size=(190, 190))
        self.qr_label.configure(image=self._qr_photo, text="")

    def _quality_changed(self, _value: str) -> None:
        self._refresh_access_link()

    def _start_server(self) -> None:
        if self._running:
            return
        try:
            self._server.start("0.0.0.0", self.port, self.tls_cert, self.tls_key)
        except (OSError, ValueError) as error:
            messagebox.showerror("Could not start server", str(error))
            return
        self._running = True
        self.start_button.configure(state="disabled")
        self.stop_button.configure(state="normal")
        self._set_status("Starting local server")
        self.after(500, self._check_server_start)

    def _check_server_start(self) -> None:
        if not self._running:
            return
        if not self._server.is_alive:
            self._running = False
            self.start_button.configure(state="normal")
            self.stop_button.configure(state="disabled")
            self._set_status("Server failed to start")
            messagebox.showerror(
                "Could not start server",
                "The local server did not start. Check whether another app is using the selected port.",
            )
            return
        if self._server.is_ready:
            self._set_status("Waiting for phone")
            return
        self.after(250, self._check_server_start)

    def _stop_server(self) -> None:
        if not self._running:
            return
        self._running = False
        self._server.stop()
        self.start_button.configure(state="normal")
        self.stop_button.configure(state="disabled")
        self._set_status("Stopped")
        self.preview.configure(image="", text="Server stopped.")
        self._preview_photo = None
        with self._image_lock:
            self._latest_frame = None

    def _set_status_from_server(self, status: str) -> None:
        self.after(0, lambda: self._set_status(status))

    def _set_status(self, status: str) -> None:
        if not self.winfo_exists():
            return
        self.status_label.configure(text=status)

    def _receive_frame(self, image: Image.Image) -> None:
        with self._image_lock:
            self._latest_frame = image
            self._frame_revision += 1
            self._frame_count += 1
            elapsed = time.monotonic() - self._fps_started
            if elapsed >= 1:
                self._fps = round(self._frame_count / elapsed)
                self._frame_count = 0
                self._fps_started = time.monotonic()

    def _update_preview(self) -> None:
        if not self.winfo_exists():
            return
        with self._image_lock:
            frame = self._latest_frame
            revision = self._frame_revision
            fps = self._fps
        if frame is not None and revision != self._rendered_revision:
            preview_width = max(self.preview.winfo_width(), 320)
            preview_height = max(self.preview.winfo_height(), 240)
            image = frame.copy()
            image.thumbnail((preview_width, preview_height), Image.Resampling.LANCZOS)
            self._preview_photo = ImageTk.PhotoImage(image)
            self.preview.configure(image=self._preview_photo, text="")
            self._rendered_revision = revision
        self.fps_label.configure(text=f"{fps} FPS")
        self.after(30, self._update_preview)

    def _save_screenshot(self) -> None:
        with self._image_lock:
            frame = self._latest_frame.copy() if self._latest_frame is not None else None
        if frame is None:
            messagebox.showinfo("No video yet", "Pair a phone and start its camera before saving a screenshot.")
            return
        filename = filedialog.asksaveasfilename(
            title="Save camera screenshot",
            defaultextension=".png",
            filetypes=[("PNG image", "*.png"), ("JPEG image", "*.jpg;*.jpeg")],
        )
        if filename:
            try:
                frame.save(filename)
            except OSError as error:
                messagebox.showerror("Could not save screenshot", str(error))

    def _toggle_fullscreen(self, enabled: bool | None = None) -> None:
        self._fullscreen = not self._fullscreen if enabled is None else enabled
        self.attributes("-fullscreen", self._fullscreen)

    def _close(self) -> None:
        self._running = False
        self._server.stop()
        self.destroy()


def run_app(port: int, tls_cert: Path | None, tls_key: Path | None) -> None:
    app = CameraApp(port=port, tls_cert=tls_cert, tls_key=tls_key)
    app.mainloop()
