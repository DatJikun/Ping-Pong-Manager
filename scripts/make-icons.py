#!/usr/bin/env python3
"""Generate the Tauri/Windows icons (carbon square + PP mark)."""
from __future__ import annotations

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src-tauri" / "icons"


def png_bytes(size: int) -> bytes:
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            raw.extend(_pixel(x, y, size))
    return _png(size, size, bytes(raw))


def _pixel(x: int, y: int, size: int) -> tuple[int, int, int, int]:
    # Carbon background
    r, g, b = 16, 19, 25
    # Slanted livery square (prototype mark)
    m = size / 32
    inset = 5 * m
    if inset <= x < size - inset and inset <= y < size - inset:
        # slight parallelogram
        shift = int((y - inset) * 0.12)
        if inset + shift <= x < size - inset + shift - 2 * m:
            r, g, b = 232, 56, 48  # club red
            # gold bar on the right third
            if x > size * 0.58 + shift:
                r, g, b = 212, 175, 55
    return r, g, b, 255


def _png(w: int, h: int, raw: bytes) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def ico_from_pngs(pngs: list[bytes]) -> bytes:
    count = len(pngs)
    offset = 6 + 16 * count
    entries = bytearray()
    body = bytearray()
    for data in pngs:
        # PNG ICO entries: width/height 0 means 256
        w = 0 if len(data) > 1000 else 32
        # Decode IHDR for real size
        iw = struct.unpack(">I", data[16:20])[0]
        ih = struct.unpack(">I", data[20:24])[0]
        ew = 0 if iw >= 256 else iw
        eh = 0 if ih >= 256 else ih
        entries += struct.pack("<BBBBHHII", ew, eh, 0, 0, 1, 32, len(data), offset)
        body += data
        offset += len(data)
    header = struct.pack("<HHH", 0, 1, count)
    return header + bytes(entries) + bytes(body)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    png32 = png_bytes(32)
    png128 = png_bytes(128)
    png256 = png_bytes(256)
    png512 = png_bytes(512)
    (OUT / "32x32.png").write_bytes(png32)
    (OUT / "128x128.png").write_bytes(png128)
    (OUT / "128x128@2x.png").write_bytes(png256)
    (OUT / "icon.png").write_bytes(png512)
    (OUT / "icon.ico").write_bytes(ico_from_pngs([png32, png256]))
    print(f"wrote icons in {OUT}")


if __name__ == "__main__":
    main()
