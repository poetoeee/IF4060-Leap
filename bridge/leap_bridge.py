"""GesturMap Leap bridge: Ultraleap hand tracking -> ws://127.0.0.1:8765.

Requires Python 3.8 x64, Ultraleap Gemini hand tracking service, and the official
leapc-python-bindings (`pip install -e leapc-python-api`). See bridge/README.md.

Messages (JSON):
  {"type": "frame",  "data": {"timestamp": ms, "hands": [HandState, ...]}}
  {"type": "status", "data": {"service": "running|missing", "device": "connected|disconnected"}}
Binary messages: IR preview, `<u16 width><u16 height>` + 8-bit grayscale pixels, only to clients that sent
  {"type": "preview", "data": {"enabled": true}}
"""
import asyncio
import json
import math
import os
import platform
import struct
import sys
import threading
import time
import types

# Auto-discover local leapc-python-bindings if running from repo or packaged app resources
_HERE = os.path.abspath(os.path.dirname(__file__))
_SEARCH_BASES = [
    _HERE,
    os.path.dirname(_HERE),
    os.path.dirname(os.path.dirname(_HERE)),
    os.path.dirname(os.path.dirname(os.path.dirname(_HERE))),
]
for _base in _SEARCH_BASES:
    for _sub in (
        os.path.join(_base, "leapc-python-bindings", "leapc-python-api", "src"),
        os.path.join(_base, "leapc-python-bindings", "leapc-cffi", "src"),
    ):
        if os.path.isdir(_sub) and _sub not in sys.path:
            sys.path.insert(0, _sub)


def _sanitise_leapc_header(input_str: str) -> str:
    """Sanitise LeapC.h so it can be loaded by cffi.FFI().cdef(...) at runtime (ABI mode)."""
    lines = input_str.replace("\r\n", "\n").split("\n")
    value_defines = {"LEAP_DISTORTION_MATRIX_N": None}
    for line in lines:
        if line.startswith("#define"):
            parts = line.split(" ")
            if len(parts) >= 3 and parts[1] in value_defines:
                value_defines[parts[1]] = parts[2]
    replacements = {"LEAP_CALL": "", "LEAP_EXPORT": ""}
    for k, v in value_defines.items():
        if v is not None:
            replacements[k] = v
    replaced = []
    for line in lines:
        for k, v in replacements.items():
            line = line.replace(k, v)
        replaced.append(line)

    filtered = []
    if_depth = 0
    for line in replaced:
        if line.startswith("#"):
            stripped = line.replace(" ", "")[1:]
            if stripped.startswith("if"):
                if_depth += 1
            elif stripped.startswith("endif"):
                if_depth -= 1
        elif if_depth == 1:
            if not line.startswith("LEAP_STATIC_ASSERT"):
                filtered.append(line)
    return "\n".join(filtered)


def _candidate_sdk_dirs():
    env_sdk = os.getenv("LEAPSDK_INSTALL_LOCATION")
    candidates = []
    if env_sdk:
        candidates.append(env_sdk)
    sys_name = platform.system()
    if sys_name == "Windows":
        candidates.append(r"C:\Program Files\Ultraleap\LeapSDK")
    elif sys_name == "Darwin":
        candidates.append("/Applications/Ultraleap Hand Tracking.app/Contents/LeapSDK")
    else:
        candidates.extend(["/usr/lib/ultraleap-hand-tracking-service", "/opt/ultraleap/LeapSDK", "/usr"])
    for base in _SEARCH_BASES:
        cffi_dir = os.path.join(base, "leapc-python-bindings", "leapc-cffi", "src", "leapc_cffi")
        if os.path.isdir(cffi_dir):
            candidates.append(cffi_dir)
    return candidates


def _ensure_leapc_cffi():
    """Ensure `leapc_cffi` is importable, falling back to CFFI ABI mode (dlopen) so any Python 3.8+ works without C compilation."""
    bundled_cffi_src = None
    for base in _SEARCH_BASES:
        cand = os.path.join(base, "leapc-python-bindings", "leapc-cffi", "src")
        if os.path.isdir(os.path.join(cand, "leapc_cffi")):
            bundled_cffi_src = cand
            break

    try:
        import leapc_cffi as _existing
        if hasattr(_existing, "ffi") and hasattr(_existing, "libleapc"):
            cur_sdk = os.getenv("LEAPSDK_INSTALL_LOCATION", "")
            if not (cur_sdk and os.path.isdir(os.path.join(cur_sdk, "leapc_cffi"))) and bundled_cffi_src:
                os.environ["LEAPSDK_INSTALL_LOCATION"] = bundled_cffi_src
            return
    except Exception:
        pass

    from cffi import FFI

    sys_name = platform.system()
    lib_names = (
        ["LeapC.dll"]
        if sys_name == "Windows"
        else ["libLeapC.5.dylib", "libLeapC.dylib"]
        if sys_name == "Darwin"
        else ["libLeapC.so", "libLeapC.so.5"]
    )

    header_path = os.getenv("LEAPC_HEADER_OVERRIDE")
    lib_path = os.getenv("LEAPC_LIB_OVERRIDE")

    for sdk in _candidate_sdk_dirs():
        if not header_path or not os.path.isfile(header_path):
            for h_rel in (os.path.join("include", "LeapC.h"), "LeapC.h"):
                cand_h = os.path.join(sdk, h_rel)
                if os.path.isfile(cand_h):
                    header_path = cand_h
                    break
        if not lib_path or not os.path.isfile(lib_path):
            for l_dir in (os.path.join("lib", "x64"), "lib", ""):
                for l_name in lib_names:
                    cand_l = os.path.join(sdk, l_dir, l_name) if l_dir else os.path.join(sdk, l_name)
                    if os.path.isfile(cand_l):
                        lib_path = cand_l
                        break
                if lib_path and os.path.isfile(lib_path):
                    break

    if not header_path or not os.path.isfile(header_path) or not lib_path or not os.path.isfile(lib_path):
        return

    with open(header_path, "r", encoding="utf-8") as fp:
        cdef_str = _sanitise_leapc_header(fp.read())

    ffi = FFI()
    ffi.cdef(cdef_str, packed=True)
    if sys_name == "Windows" and hasattr(os, "add_dll_directory"):
        try:
            os.add_dll_directory(os.path.dirname(lib_path))
        except Exception:
            pass
    libleapc = ffi.dlopen(lib_path)

    mod = types.ModuleType("leapc_cffi")
    mod.ffi = ffi
    mod.libleapc = libleapc
    sys.modules["leapc_cffi"] = mod

    # Unmodified upstream `leap/__init__.py` checks `os.path.isdir(os.path.join(cffi_location, "leapc_cffi"))`
    # before importing `from leapc_cffi import ffi, libleapc` (which hits sys.modules["leapc_cffi"]).
    # Point LEAPSDK_INSTALL_LOCATION at a directory that contains a `leapc_cffi` subfolder if the user's SDK doesn't.
    cur_sdk = os.getenv("LEAPSDK_INSTALL_LOCATION", "")
    if not (cur_sdk and os.path.isdir(os.path.join(cur_sdk, "leapc_cffi"))):
        if bundled_cffi_src:
            os.environ["LEAPSDK_INSTALL_LOCATION"] = bundled_cffi_src
        else:
            import tempfile
            shim_root = os.path.join(tempfile.gettempdir(), "gesturmap-leapc-shim")
            os.makedirs(os.path.join(shim_root, "leapc_cffi"), exist_ok=True)
            os.environ["LEAPSDK_INSTALL_LOCATION"] = shim_root


try:
    _ensure_leapc_cffi()
    import leap
    from leap.enums import PolicyFlag
    from leapc_cffi import ffi
except ImportError as exc:
    raise SystemExit(
        "Cannot import the Ultraleap Python bindings.\n"
        "Activate .venv-leap and run bridge\\setup_leap.ps1 first.\n"
        "If the SDK is installed outside C:\\Program Files\\Ultraleap\\LeapSDK, "
        "set LEAPSDK_INSTALL_LOCATION before setup.\n"
        f"Original error: {exc}"
    ) from exc

try:
    import websockets
except ImportError as exc:
    raise SystemExit(
        "The websockets package is missing. Run: "
        "python -m pip install -r bridge\\requirements.txt"
    ) from exc

HOST, PORT = "127.0.0.1", 8765
MAX_HZ = 60
# Leap reports height above the device; recentre so a hand ~20 cm above it sits at y = 0.
Y_OFFSET_MM = 200.0
RETRY_S = 2.0
IMAGE_HZ = 15
IMAGE_MAX_WIDTH = 320


def vec(v):
    return {"x": float(v.x), "y": float(v.y) - Y_OFFSET_MM, "z": float(v.z)}


def to_hand_state(hand):
    """LeapC hand -> common format: 21 landmarks in MediaPipe order, mm, +x right, +y up, +z toward user."""
    t = hand.thumb
    points = [hand.arm.next_joint,  # 0 wrist
              t.proximal.prev_joint, t.proximal.next_joint, t.intermediate.next_joint, t.distal.next_joint]
    for d in (hand.index, hand.middle, hand.ring, hand.pinky):
        points += [d.metacarpal.next_joint, d.proximal.next_joint, d.intermediate.next_joint, d.distal.next_joint]
    return {
        "side": "left" if str(hand.type) == "HandType.Left" else "right",
        "confidence": float(hand.confidence),
        "landmarks": [vec(p) for p in points],
        "native": {"grab": float(hand.grab_strength), "pinch": float(hand.pinch_strength)},
    }


def encode_image(image):
    """Left IR camera image -> `<u16 w><u16 h>` + 8-bit pixels, downscaled to at most IMAGE_MAX_WIDTH."""
    c = image.c_data
    w, h, bpp = c.properties.width, c.properties.height, c.properties.bpp
    raw = ffi.buffer(ffi.cast("uint8_t *", c.data) + c.offset, w * h * bpp)[:]
    step = math.ceil(w / IMAGE_MAX_WIDTH)
    rows = [raw[r * w * bpp:(r + 1) * w * bpp:step * bpp] for r in range(0, h, step)]
    return struct.pack("<HH", len(rows[0]), len(rows)) + b"".join(rows)


class Bridge(leap.Listener):
    """Runs on the LeapC poll thread; hands results to the asyncio loop thread-safely."""

    def __init__(self, loop):
        super().__init__()
        self.loop = loop
        self.clients = set()
        self.image_clients = set()
        self.service = "missing"
        self.device = "disconnected"
        self.last_sent = 0.0
        self.last_image = 0.0
        # Wakes run_leap so the Images policy follows preview requests promptly.
        self.wake = threading.Event()

    # --- LeapC callbacks (poll thread) ---
    def on_connection_event(self, event):
        self.set_status(service="running")

    def on_connection_lost_event(self, event):
        self.set_status(service="missing", device="disconnected")

    def on_device_event(self, event):
        self.set_status(device="connected")

    def on_device_lost_event(self, event):
        self.set_status(device="disconnected")

    def on_device_failure_event(self, event):
        self.set_status(device="disconnected")

    def on_device_status_change_event(self, event):
        self.set_status(device="connected")

    def on_tracking_event(self, event):
        now = time.monotonic()
        if now - self.last_sent < 1.0 / MAX_HZ:
            return
        self.last_sent = now
        try:
            hands = [to_hand_state(h) for h in event.hands]
        except Exception as exc:  # never let one bad frame kill the poll thread
            print("[bridge] frame skipped:", exc)
            return
        self.post({"type": "frame", "data": {"timestamp": now * 1000.0, "hands": hands}})

    def on_image_event(self, event):
        now = time.monotonic()
        if not self.image_clients or now - self.last_image < 1.0 / IMAGE_HZ:
            return
        self.last_image = now
        try:
            payload = encode_image(event.image[0])
        except Exception as exc:
            print("[bridge] image skipped:", exc)
            return
        self.loop.call_soon_threadsafe(self.send_images, payload)

    # --- shared ---
    def set_status(self, service=None, device=None):
        self.service = service or self.service
        self.device = device or self.device
        print("[bridge] service={} device={}".format(self.service, self.device))
        self.post(self.status_message())

    def status_message(self):
        return {"type": "status", "data": {"service": self.service, "device": self.device}}

    def post(self, msg):
        self.loop.call_soon_threadsafe(self.broadcast, json.dumps(msg))

    # --- asyncio loop ---
    def broadcast(self, text):
        for ws in list(self.clients):
            asyncio.ensure_future(self.safe_send(ws, text))

    def send_images(self, payload):
        for ws in list(self.image_clients):
            asyncio.ensure_future(self.safe_send(ws, payload))

    async def safe_send(self, ws, message):
        try:
            await ws.send(message)
        except websockets.ConnectionClosed:
            self.drop(ws)

    def drop(self, ws):
        self.clients.discard(ws)
        self.set_preview(ws, False)

    def set_preview(self, ws, enabled):
        if enabled == (ws in self.image_clients):
            return
        if enabled:
            self.image_clients.add(ws)
        else:
            self.image_clients.discard(ws)
        self.wake.set()

    async def handler(self, ws, path=None):  # `path` for websockets < 10.1
        self.clients.add(ws)
        print("[bridge] client connected ({})".format(len(self.clients)))
        try:
            await ws.send(json.dumps(self.status_message()))
            async for raw in ws:
                try:
                    msg = json.loads(raw)
                except ValueError:
                    continue
                if isinstance(msg, dict) and msg.get("type") == "preview":
                    self.set_preview(ws, bool(msg.get("data", {}).get("enabled")))
        except websockets.ConnectionClosed:
            pass
        finally:
            self.drop(ws)
            print("[bridge] client left ({})".format(len(self.clients)))


def run_leap(bridge):
    """Keeps a LeapC connection open; retries while the tracking service is unavailable."""
    while True:
        connection = leap.Connection()
        connection.add_listener(bridge)
        try:
            with connection.open():
                connection.set_tracking_mode(leap.TrackingMode.Desktop)
                bridge.set_status(device="connected" if connection.get_devices() else "disconnected")
                images_on = False
                while True:
                    bridge.wake.clear()
                    want_images = bool(bridge.image_clients)
                    if want_images != images_on:
                        images = [PolicyFlag.Images]
                        if want_images:
                            connection.set_policy_flags(flags_to_set=images)
                        else:
                            connection.set_policy_flags(flags_to_clear=images)
                        images_on = want_images
                    devices = connection.get_devices()
                    bridge.set_status(device="connected" if devices else "disconnected")
                    bridge.wake.wait(1)
        except Exception as exc:
            print("[bridge] Leap connection failed: {} - retrying in {}s".format(exc, RETRY_S))
            bridge.set_status(service="missing", device="disconnected")
            time.sleep(RETRY_S)


async def main():
    bridge = Bridge(asyncio.get_running_loop())
    threading.Thread(target=run_leap, args=(bridge,), daemon=True).start()
    try:
        await websockets.serve(bridge.handler, HOST, PORT)
    except OSError as exc:
        raise SystemExit(
            f"Cannot listen on ws://{HOST}:{PORT}. "
            "Close any other Leap bridge using port 8765 and try again."
        ) from exc
    print("[bridge] serving ws://{}:{} - Ctrl+C to stop".format(HOST, PORT))
    await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
