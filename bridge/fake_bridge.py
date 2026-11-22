"""Stand-in for leap_bridge.py with no Leap hardware: same protocol, synthetic hand.

Proves the web app's Leap path (connect, status, frames, recognition) end to end.
Needs only `pip install websockets`. Run: python bridge/fake_bridge.py

The hand idles open, swipes right every 4 s and glides back slowly (not a swipe).
When the app asks for the IR preview it also gets a synthetic image: a bright blob following the hand.
"""
import asyncio
import itertools
import json
import math
import struct
import time

import websockets

HOST, PORT, HZ = "127.0.0.1", 8765, 60
IMAGE_EVERY = 4  # frames per IR image: 15 Hz
IR_W, IR_H, IR_RADIUS = 320, 120, 28
IR_BACKGROUND, IR_PALM = 20, 208  # 8-bit brightness

# Open right hand, palm to the screen, wrist at origin (mm). Index 0 wrist, 1-4 thumb, then index..pinky.
THUMB = [(-25, 25), (-45, 45), (-62, 64), (-80, 85)]
FINGERS = [((-25, 80), (40, 25, 22)), ((-5, 88), (45, 28, 24)), ((15, 84), (42, 26, 22)), ((32, 74), (32, 20, 18))]


def hand_at(x, y):
    pts = [(0, 0)] + THUMB
    for (mx, my), lengths in FINGERS:
        pts.append((mx, my))
        for length in lengths:
            pts.append((mx, pts[-1][1] + length))
    return {
        "side": "right",
        "confidence": 1.0,
        "landmarks": [{"x": x + px, "y": y + py, "z": 0.0} for px, py in pts],
        "native": {"grab": 0.25, "pinch": 0.0},  # relaxed: open enough to swipe, not an Open Palm
    }


def wrist_x(t):
    """Fast 260 mm swipe right in 0.3 s every 4 s, then a slow 1.2 s return."""
    p = t % 4.0
    if p < 2.0:
        return -130.0
    if p < 2.3:
        u = (p - 2.0) / 0.3
        return -130.0 + 260.0 * u * u * (3 - 2 * u)
    if p < 2.6:
        return 130.0
    u = min(1.0, (p - 2.6) / 1.2)
    return 130.0 - 260.0 * u * u * (3 - 2 * u)


def ir_image(x_mm):
    """`<u16 w><u16 h>` + 8-bit pixels: dark background, bright palm blob at the hand's x."""
    cx, cy = int(IR_W / 2 + x_mm * IR_W / 400), IR_H // 2
    rows = []
    for y in range(IR_H):
        row = bytearray([IR_BACKGROUND]) * IR_W
        dy = y - cy
        if abs(dy) < IR_RADIUS:
            half = int(math.sqrt(IR_RADIUS ** 2 - dy * dy))
            lo, hi = max(0, cx - half), min(IR_W, cx + half)
            row[lo:hi] = bytes([IR_PALM]) * max(0, hi - lo)
        rows.append(bytes(row))
    return struct.pack("<HH", IR_W, IR_H) + b"".join(rows)


async def listen(ws, state):
    async for raw in ws:
        try:
            msg = json.loads(raw)
        except ValueError:
            continue
        if isinstance(msg, dict) and msg.get("type") == "preview":
            state["preview"] = bool(msg.get("data", {}).get("enabled"))


async def handler(ws, path=None):
    print("[fake] client connected")
    await ws.send(json.dumps({"type": "status", "data": {"service": "running", "device": "connected"}}))
    state = {"preview": False}
    listener = asyncio.ensure_future(listen(ws, state))
    start = time.monotonic()
    try:
        for frame in itertools.count():
            t = time.monotonic() - start
            x = wrist_x(t)
            hand = hand_at(x, -65 + 4 * math.sin(t))
            await ws.send(json.dumps({"type": "frame", "data": {"timestamp": time.monotonic() * 1000.0, "hands": [hand]}}))
            if state["preview"] and frame % IMAGE_EVERY == 0:
                await ws.send(ir_image(x))
            await asyncio.sleep(1.0 / HZ)
    except websockets.ConnectionClosed:
        print("[fake] client left")
    finally:
        listener.cancel()


async def main():
    await websockets.serve(handler, HOST, PORT)
    print("[fake] serving ws://{}:{} - Ctrl+C to stop".format(HOST, PORT))
    await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
