# Leap bridge

The browser can't read the Leap Motion Controller directly. `leap_bridge.py` reads hands from the Ultraleap tracking service and serves them to the web app on `ws://127.0.0.1:8765`. In the app, choose **Dashboard → Sensor → Tracking source → Leap**.

## One-time setup

1. Install **Ultraleap Gemini 5.20** (hand tracking software). Plug in the controller and check it tracks in the Ultraleap Control Panel.
2. Install **64-bit Python 3.8+**.
3. Run the included setup script from the repository root. It creates `.venv-leap`, downloads the official bindings, detects the SDK, and builds the CFFI extension when a precompiled one is unavailable:

   **Windows (PowerShell):**
   ```powershell
   powershell -ExecutionPolicy Bypass -File bridge\setup_leap.ps1
   ```

   **Linux / WSL / macOS (Bash or pwsh):**
   ```bash
   bash bridge/setup_leap.sh
   # or with PowerShell Core:
   pwsh -File bridge/setup_leap.ps1
   ```

   If Gemini is not in the default install location (`C:/Program Files/Ultraleap/LeapSDK` on Windows, `/usr/include` + `/usr/lib/ultraleap-hand-tracking-service` on Linux, `/Applications/Ultraleap Hand Tracking.app/Contents/LeapSDK` on macOS), set `LEAPSDK_INSTALL_LOCATION` (or `LEAPC_HEADER_OVERRIDE` / `LEAPC_LIB_OVERRIDE` on Linux) before running setup.

4. **Close TouchFree** if it's running. It competes for the tracking stream.

## Run

You can start and stop the Python bridge directly from the Gesturmap desktop app (**Dashboard → Sensor → Leap → Python bridge On/Off**), or run it manually from a terminal:

**Windows:**
```powershell
.venv-leap\Scripts\python.exe bridge\leap_bridge.py
```

**Linux / WSL / macOS:**
```bash
.venv-leap/bin/python bridge/leap_bridge.py
```

Keep the terminal open. It prints `service=running device=connected` once the controller is ready, and logs each browser that connects.

If it stays at `service=running device=disconnected`, Gemini is running but LeapC sees no controller. Reconnect the USB cable directly to the computer, avoid a passive USB hub, close TouchFree and other Leap applications, and confirm the controller appears in Ultraleap Control Panel before restarting the bridge. The Dashboard stage shows the hand skeleton; turn on **Camera preview** there to also see the left infrared camera (as an inset, since it looks up from below and doesn't line up with the skeleton).

| App shows | Meaning |
|---|---|
| Leap bridge not running | `leap_bridge.py` isn't running (the app retries every 2 s) |
| Tracking Service not running | Gemini service is stopped |
| Leap Motion not connected | Controller unplugged or not detected |

## Test without a controller

`fake_bridge.py` speaks the same protocol with a synthetic hand that swipes right every 4 s. It needs only `pip install websockets` (any Python 3.8+):

```powershell
python bridge/fake_bridge.py
```

Select **Leap** in the app: the skeleton moves and the HUD shows Swipe Right. With **Camera preview** on, the IR inset shows a bright blob following the hand. Stop it before running the real bridge — both use port 8765.

## Protocol

```json
{ "type": "frame",  "data": { "timestamp": 123.4, "hands": [HandState] } }
{ "type": "status", "data": { "service": "running|missing", "device": "connected|disconnected" } }
```

IR preview: the app sends `{ "type": "preview", "data": { "enabled": true|false } }`. While any client has it enabled, the bridge turns on the LeapC Images policy and sends that client binary messages at ~15 Hz: `<u16 width><u16 height>` (little-endian) followed by 8-bit grayscale pixels of the left camera, downscaled to at most 320 px wide.

`HandState` is the app's common hand format (`src/tracking/types.ts`): 21 landmarks in MediaPipe order (wrist, thumb, index…pinky), millimetres, +x right, +y up (recentred by −200 mm), +z toward the user, plus `native.grab` / `native.pinch` from LeapC.
