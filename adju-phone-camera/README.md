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

The app automatically creates a private certificate authority and a short-lived HTTPS certificate for the PC's current LAN IP. On first run, it shows:

- An HTTPS QR code for pairing and camera use on port `8765`.
- A certificate download link over the local network on port `8766`.
- The CA certificate's SHA-256 fingerprint, which must match the phone certificate before you trust it.

First, install and trust the CA certificate on the phone as described below. Then scan the HTTPS QR code, enter the six-digit PIN from the PC, choose a camera and resolution, and tap **Start camera**. Approve the browser's camera prompt. On the desktop, the preview shows incoming video and FPS; use **Save screenshot** or **Fullscreen preview** as needed. The HTTP listener on port `8766` only serves the public CA certificate; pairing and signaling are available over HTTPS/WSS on port `8765`.

The available video targets are 480p, 720p, and 1080p. Actual resolution and frame rate depend on the phone, browser, Wi-Fi, and operating system. Switch between front and back cameras on the phone page; stop the stream first to change settings.

## Install and trust the local certificate on the phone

The app stores its private CA key only on this PC under `%LOCALAPPDATA%\ADJU PHONE CAMERA\certificates`. It creates a server certificate for the current private LAN IP. Only the public CA certificate is downloadable; the private CA key is never served or bundled. A new server certificate is issued if the LAN IP changes, using the same CA.

1. Start the desktop server. On the phone, open the **CA download** link shown by the app, for example `http://192.168.1.20:8766/ca.cer`. This separate HTTP endpoint serves only the public certificate, not the camera page or signaling.
2. Before installing it, compare the certificate's SHA-256 fingerprint shown in the desktop app with the certificate details on the phone wherever the OS exposes its fingerprint. Only install it if the identity matches and you trust this PC's CA.
3. Install the downloaded certificate specifically as a **CA/root certificate**, then explicitly enable trust for it:
   - **Android:** Settings > Security & privacy (names vary) > More security settings > Encryption & credentials > Install a certificate > CA certificate. Confirm the OS trust warning only after checking the fingerprint.
   - **iPhone/iPad:** Open the downloaded configuration profile in Settings and install it. Then open Settings > General > About > Certificate Trust Settings and enable full trust for this root certificate. Menu names vary by iOS version.
4. Return to the app and scan its **HTTPS** QR code, such as `https://192.168.1.20:8765/`. The browser must show a secure page without a certificate warning. Enter the pairing PIN, tap **Start camera**, and grant camera permission.

If the phone OS or browser does not allow installing and trusting this private CA, camera access from that phone browser will not work. Use an organization-approved certificate/domain instead. Do not bypass certificate warnings or use plain HTTP as a camera-access workaround. When finished, remove the installed CA profile from the phone's certificate settings if you no longer need it; the private CA key remains on the PC. If you provide a custom TLS certificate with `python main.py --tls-cert CERT.pem --tls-key KEY.pem`, the app does not open its local CA download listener; configure your certificate's CA trust on the phone separately.

## Windows Firewall and network limits

Allow the app through Windows Defender Firewall on **Private networks only** when prompted. HTTPS signaling uses TCP port `8765`, the CA certificate download uses TCP port `8766`, and WebRTC media requires direct UDP connectivity. If creating rules manually, run PowerShell as Administrator and restrict access to the Private profile and local subnet:

```powershell
$python = (Get-Command python).Source
New-NetFirewallRule -DisplayName "ADJU PHONE CAMERA signaling" -Direction Inbound -Program $python -Action Allow -Profile Private -Protocol TCP -LocalPort 8765 -RemoteAddress LocalSubnet
New-NetFirewallRule -DisplayName "ADJU PHONE CAMERA CA download" -Direction Inbound -Program $python -Action Allow -Profile Private -Protocol TCP -LocalPort 8766 -RemoteAddress LocalSubnet
New-NetFirewallRule -DisplayName "ADJU PHONE CAMERA WebRTC" -Direction Inbound -Program $python -Action Allow -Profile Private -Protocol UDP -RemoteAddress LocalSubnet
```

Replace the executable with the packaged app path when using the PyInstaller build, and adjust both TCP ports if you chose a different port. Remove these named rules when you no longer need them. This app deliberately has no TURN relay fallback. Do not disable the firewall globally. Guest Wi-Fi, client/AP isolation, VPN policy, or restrictive router/firewall rules may block the phone-to-PC connection. Both devices must be on a network that permits peer-to-peer LAN traffic.

If the phone shows its camera preview but reports that it is still connecting, the camera permission and local capture have succeeded; the direct WebRTC video path is still negotiating. The PC shows **Phone paired** after PIN authentication and changes to **Receiving video** only after a frame arrives. If it stays at **Phone paired** or shows **WebRTC failed**, confirm the PC's Private-network UDP firewall rule, that the phone is not on guest Wi-Fi, and that both devices are still on the same local network. The phone's “answer received” status means signaling succeeded, not that video is already flowing.

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
