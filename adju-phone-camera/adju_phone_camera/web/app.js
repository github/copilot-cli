"use strict";

const statusElement = document.querySelector("#status");
const pairForm = document.querySelector("#pair-form");
const pinInput = document.querySelector("#pin");
const pairButton = document.querySelector("#pair-button");
const controls = document.querySelector("#camera-controls");
const resolution = document.querySelector("#resolution");
const facing = document.querySelector("#facing");
const startButton = document.querySelector("#start-button");
const stopButton = document.querySelector("#stop-button");
const video = document.querySelector("#local-video");

let socket;
let peer;
let stream;
let paired = false;
let shouldReconnect = true;

const requestedResolution = new URLSearchParams(location.search).get("resolution");
if (["480", "720", "1080"].includes(requestedResolution)) {
  resolution.value = requestedResolution;
}

function setStatus(message) {
  statusElement.textContent = message;
}

function connect() {
  const scheme = location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${scheme}//${location.host}/ws`);
  socket.addEventListener("open", () => {
    setStatus("Connected to PC. Enter the PIN shown in the desktop app.");
    if (paired && pinInput.value) {
      socket.send(JSON.stringify({ type: "pair", pin: pinInput.value }));
    }
  });
  socket.addEventListener("message", async (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === "paired") {
        paired = true;
        pairForm.hidden = true;
        controls.hidden = false;
        startButton.disabled = false;
        setStatus("Phone paired. Camera remains off until you start it.");
      } else if (message.type === "answer" && peer) {
        await peer.setRemoteDescription({ type: "answer", sdp: message.sdp });
        setStatus("Camera connected to PC.");
      } else if (message.type === "stopped") {
        await closeCamera(false);
        setStatus("Camera stopped. You can start it again when ready.");
      } else if (message.type === "error") {
        if (controls.hidden) {
          paired = false;
          pairButton.disabled = false;
        }
        setStatus(message.message || "The PC rejected the request.");
      }
    } catch (error) {
      setStatus(`Invalid response or WebRTC negotiation error: ${error.message}`);
      await closeCamera(true);
    }
  });
  socket.addEventListener("close", async () => {
    await closeCamera(false);
    setStatus("Connection lost. Reconnecting…");
    if (shouldReconnect) window.setTimeout(connect, 2000);
  });
  socket.addEventListener("error", () => setStatus("Could not reach the PC. Check Wi-Fi and firewall settings."));
}

pairForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    setStatus("Not connected to the PC yet. Please wait and try again.");
    return;
  }
  const pin = pinInput.value.trim();
  if (!/^[0-9]{6}$/.test(pin)) {
    setStatus("Enter the six-digit PIN shown in the desktop app.");
    return;
  }
  paired = true;
  pairButton.disabled = true;
  socket.send(JSON.stringify({ type: "pair", pin }));
});

startButton.addEventListener("click", async () => {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    setStatus("Camera access requires HTTPS with a certificate trusted by this phone. See the desktop README.");
    return;
  }
  startButton.disabled = true;
  try {
    const height = Number(resolution.value);
    const width = Math.round(height * 16 / 9);
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: facing.value },
        width: { ideal: width },
        height: { ideal: height },
      },
    });
    video.srcObject = stream;
    peer = new RTCPeerConnection({ iceServers: [] });
    for (const track of stream.getTracks()) peer.addTrack(track, stream);
    peer.addEventListener("connectionstatechange", () => {
      if (peer && peer.connectionState === "failed") {
        setStatus("WebRTC connection failed. Check that the phones share Wi-Fi and UDP is allowed.");
      }
    });
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    await waitForIceGathering(peer);
    if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error("The signaling connection was lost.");
    socket.send(JSON.stringify({ type: "offer", sdp: peer.localDescription.sdp }));
    stopButton.hidden = false;
    resolution.disabled = true;
    facing.disabled = true;
    setStatus("Camera is on. Waiting for the PC to connect…");
  } catch (error) {
    await closeCamera(false);
    startButton.disabled = false;
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      setStatus("Camera permission was denied. Allow camera access in the browser, then try again.");
    } else if (error.name === "NotFoundError") {
      setStatus("No camera was found on this phone.");
    } else {
      setStatus(error.message || "Could not start the camera.");
    }
  }
});

stopButton.addEventListener("click", async () => {
  if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "stop" }));
  await closeCamera(false);
  setStatus("Camera stopped.");
});

async function closeCamera(enableStart) {
  if (peer) {
    peer.close();
    peer = null;
  }
  if (stream) {
    for (const track of stream.getTracks()) track.stop();
    stream = null;
  }
  video.srcObject = null;
  startButton.disabled = !paired || !enableStart;
  stopButton.hidden = true;
  resolution.disabled = false;
  facing.disabled = false;
}

function waitForIceGathering(connection) {
  if (connection.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      connection.removeEventListener("icegatheringstatechange", check);
      resolve();
    };
    const check = () => {
      if (connection.iceGatheringState === "complete") finish();
    };
    const timeout = window.setTimeout(finish, 10000);
    connection.addEventListener("icegatheringstatechange", check);
    check();
  });
}

window.addEventListener("beforeunload", () => {
  shouldReconnect = false;
  if (stream) for (const track of stream.getTracks()) track.stop();
  if (peer) peer.close();
  if (socket && socket.readyState === WebSocket.OPEN) socket.close();
});

connect();
