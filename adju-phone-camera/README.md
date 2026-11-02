# ADJU PHONE CAMERA

A Windows desktop app that receives an Android or iPhone camera feed over your local Wi-Fi. The app uses a private six-digit pairing PIN, a local WebSocket for signaling, and a direct WebRTC connection for video. It does not use cloud services, STUN/TURN servers, or an external video relay.

## Requirements

- Windows 10 or 11, 64-bit, and Python 3.10 or later.
- PC and phone on the same Wi-Fi/LAN; guest-network isolation can prevent them from seeing each other.
- A modern Android or iPhone browser. Camera permission is requested only after tapping **Start camera** on the phone.
- For camera access from a phone, use trusted HTTPS as described below. A plain `http://192.168.x.x` LAN URL is not a secure context and is not sufficient for `getUserMedia` on current Android browsers or Safari.

## Install and run

Open PowerShell in this directory:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python main.py
```

The desktop app shows a QR code, the current LAN URL, and a six-digit PIN. Scan the QR code on the phone, enter the PIN in the phone page, then choose a camera and resolution and tap **Start camera**. The browser asks for camera permission at that point. On the desktop, the preview shows incoming video and FPS; use **Save screenshot** or **Fullscreen preview** as needed.

The available video targets are 480p, 720p, and 1080p. Actual resolution and frame rate depend on the phone, browser, Wi-Fi, and operating system. Switch between front and back cameras on the phone page; stop the stream first to change settings.

## Trusted local HTTPS for phone camera access

Browsers restrict `navigator.mediaDevices.getUserMedia()` to secure contexts. `localhost` is treated specially when opened on the same device, but a phone opening the PC's LAN IP is not localhost. Do not rely on plain HTTP, and do not bypass certificate warnings.

One local-only option is [mkcert](https://github.com/FiloSottile/mkcert), which creates a private development CA and a certificate for your PC's LAN IP:

1. Install mkcert on the PC and run `mkcert -install`.
2. Find the PC's LAN IPv4 address (the desktop app displays it), then create a certificate in a private folder:

   ```powershell
   mkcert 192.168.1.20
   ```

   Replace the example address with the actual address. Keep the generated private key private.
3. Run `mkcert -CAROOT` to find the local CA folder. Transfer only `rootCA.pem` to the phone using a private method such as USB, then install and trust it using the phone's certificate settings. Never transfer `rootCA-key.pem`. Android and iOS require explicit trust configuration; follow the current device instructions for your OS and browser. Do not install a CA you do not control.
4. Start the app using the generated certificate and key:

   ```powershell
   python main.py --tls-cert .\192.168.1.20.pem --tls-key .\192.168.1.20-key.pem
   ```

   Use the same PC IP that appears in the certificate. The desktop QR code will use `https://`.

If you cannot install and trust a local CA on the phone, camera access from that phone browser will not work. Use an organization-approved trusted certificate/domain instead, or test the browser page locally on the PC; do not treat an HTTP LAN address as a working camera workaround. No certificate, CA, or private key is bundled with this app.

## Windows Firewall and network limits

Allow the app through Windows Defender Firewall on **Private networks only** when prompted. WebRTC uses the selected TCP port for the page/signaling and direct UDP for media. If creating rules manually, run PowerShell as Administrator and restrict access to the Private profile and local subnet:

```powershell
$python = (Get-Command python).Source
New-NetFirewallRule -DisplayName "ADJU PHONE CAMERA signaling" -Direction Inbound -Program $python -Action Allow -Profile Private -Protocol TCP -LocalPort 8765 -RemoteAddress LocalSubnet
New-NetFirewallRule -DisplayName "ADJU PHONE CAMERA WebRTC" -Direction Inbound -Program $python -Action Allow -Profile Private -Protocol UDP -RemoteAddress LocalSubnet
```

Replace the executable with the packaged app path when using the PyInstaller build, and change `8765` if you chose a different port. Remove these named rules when you no longer need them. This app deliberately has no TURN relay fallback. Do not disable the firewall globally. Guest Wi-Fi, client/AP isolation, VPN policy, or restrictive router/firewall rules may block the phone-to-PC connection. Both devices must be on a network that permits peer-to-peer LAN traffic.

## Build a Windows executable

From this directory with the virtual environment active:

```powershell
python -m pip install pyinstaller
pyinstaller --noconfirm --clean --onefile --windowed --name "ADJU PHONE CAMERA" --add-data "adju_phone_camera\web;adju_phone_camera\web" main.py
```

The executable is created under `dist`. Windows Firewall may prompt for network access the first time it runs. The HTTPS certificate and key remain user-supplied files and are not embedded.

## Tests

```powershell
python -m pip install -r requirements-dev.txt
python -m pytest
```

The test suite covers PIN validation and throttling. End-to-end video additionally requires a supported phone browser, camera permission, a trusted HTTPS setup, and LAN connectivity.
