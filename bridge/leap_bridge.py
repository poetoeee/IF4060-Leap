"""GesturMap Leap bridge: Ultraleap hand tracking -> ws://127.0.0.1:8765.

Requires Python 3.8 x64, Ultraleap Gemini hand tracking service, and the official
leapc-python-bindings (`pip install -e leapc-python-api`). See bridge/README.md.

Messages (JSON):
  {"type": "frame",  "data": {"timestamp": ms, "hands": [HandState, ...]}}
  {"type": "status", "data": {"service": "running|missing", "device": "connected|disconnected"}}
"""
import asyncio
import json
import threading
import time

import leap
import websockets

HOST, PORT = "127.0.0.1", 8765
MAX_HZ = 60
# Leap reports height above the device; recentre so a hand ~20 cm above it sits at y = 0.
Y_OFFSET_MM = 200.0
RETRY_S = 2.0


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


class Bridge(leap.Listener):
    """Runs on the LeapC poll thread; hands results to the asyncio loop thread-safely."""

    def __init__(self, loop):
        super().__init__()
        self.loop = loop
        self.clients = set()
        self.service = "missing"
        self.device = "disconnected"
        self.last_sent = 0.0

    # --- LeapC callbacks (poll thread) ---
    def on_connection_event(self, event):
        self.set_status(service="running")

    def on_connection_lost_event(self, event):
        self.set_status(service="missing", device="disconnected")

    def on_device_event(self, event):
        self.set_status(device="connected")

    def on_device_lost_event(self, event):
        self.set_status(device="disconnected")

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

    async def safe_send(self, ws, text):
        try:
            await ws.send(text)
        except websockets.ConnectionClosed:
            self.clients.discard(ws)

    async def handler(self, ws, path=None):  # `path` for websockets < 10.1
        self.clients.add(ws)
        print("[bridge] client connected ({})".format(len(self.clients)))
        try:
            await ws.send(json.dumps(self.status_message()))
            await ws.wait_closed()
        finally:
            self.clients.discard(ws)
            print("[bridge] client left ({})".format(len(self.clients)))


def run_leap(bridge):
    """Keeps a LeapC connection open; retries while the tracking service is unavailable."""
    while True:
        connection = leap.Connection()
        connection.add_listener(bridge)
        try:
            with connection.open():
                connection.set_tracking_mode(leap.TrackingMode.Desktop)
                while True:
                    time.sleep(1)
        except Exception as exc:
            print("[bridge] Leap connection failed: {} - retrying in {}s".format(exc, RETRY_S))
            bridge.set_status(service="missing", device="disconnected")
            time.sleep(RETRY_S)


async def main():
    bridge = Bridge(asyncio.get_running_loop())
    threading.Thread(target=run_leap, args=(bridge,), daemon=True).start()
    await websockets.serve(bridge.handler, HOST, PORT)
    print("[bridge] serving ws://{}:{} - Ctrl+C to stop".format(HOST, PORT))
    await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
