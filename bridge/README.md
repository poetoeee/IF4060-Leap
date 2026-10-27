# Leap bridge

The browser can't read the Leap Motion Controller directly. `leap_bridge.py` reads hands from the Ultraleap tracking service and serves them to the web app on `ws://127.0.0.1:8765`. In the app, choose **Dashboard → Sensor → Tracking source → Leap**.

## One-time setup (Windows)

1. Install **Ultraleap Gemini 5.20** (hand tracking software). Plug in the controller and check it tracks in the Ultraleap Control Panel.
2. Install **Python 3.8 x64**. The bindings' pre-compiled module only supports 3.8 on Windows.
3. Clone the official bindings and install them with the bridge requirements into a Python 3.8 virtual environment:

   ```powershell
   py -3.8 -m venv .venv-leap
   .venv-leap\Scripts\activate
   git clone https://github.com/ultraleap/leapc-python-bindings
   pip install -r leapc-python-bindings/requirements.txt
   pip install -e leapc-python-bindings/leapc-python-api
   pip install -r bridge/requirements.txt
   ```

   If `import leap` fails because `leapc_cffi` is missing, follow the bindings README to build it (`python -m build leapc-cffi`). If Gemini is not in `C:/Program Files/Ultraleap/LeapSDK`, set `LEAPSDK_INSTALL_LOCATION`.

4. **Close TouchFree** if it's running. It competes for the tracking stream.

## Run

```powershell
.venv-leap\Scripts\activate
python bridge/leap_bridge.py
```

Keep the terminal open. It prints `service=running device=connected` once the controller is ready, and logs each browser that connects.

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

Select **Leap** in the app: the skeleton moves and the HUD shows Swipe Right. Stop it before running the real bridge — both use port 8765.

## Protocol

```json
{ "type": "frame",  "data": { "timestamp": 123.4, "hands": [HandState] } }
{ "type": "status", "data": { "service": "running|missing", "device": "connected|disconnected" } }
```

`HandState` is the common format from `docs/PRD-MVP.md` §4.1: 21 landmarks in MediaPipe order (wrist, thumb, index…pinky), millimetres, +x right, +y up (recentred by −200 mm), +z toward the user, plus `native.grab` / `native.pinch` from LeapC.
