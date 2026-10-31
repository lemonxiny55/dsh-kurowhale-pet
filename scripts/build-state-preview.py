"""Compose a documentation-only contact sheet from the existing character atlas.

Requires Pillow. Example (Windows):
  python scripts/build-state-preview.py --assets KuroWhale-Pet
The asset directory must contain pet.json and its original spritesheet.webp.
No source images, animation frames, or runtime files are changed.
"""

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


STATES = [
    ("idle", "待机", 0, 0),
    ("running-right", "向右移动", 1, 2),
    ("running-left", "向左移动", 2, 2),
    ("waving", "挥手", 3, 2),
    ("jumping", "跳跃", 4, 2),
    ("failed", "失败", 5, 4),
    ("waiting", "等待审批", 6, 2),
    ("running", "工作中", 7, 2),
    ("review", "完成回顾", 8, 3),
]
ATLAS_SHA256 = "7ae1e467778139d7da381fd860af6ebff3a3bd0385b69f9f0c278fbeb4d89298"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--assets", type=Path, required=True)
    parser.add_argument("--font", type=Path, default=Path("C:/Windows/Fonts/msyh.ttc"))
    parser.add_argument("--output", type=Path, default=Path("docs/images/kurowhale-nine-states.png"))
    args = parser.parse_args()
    manifest = json.loads((args.assets / "pet.json").read_text(encoding="utf-8"))
    atlas_path = args.assets / manifest["spritesheetPath"]
    if hashlib.sha256(atlas_path.read_bytes()).hexdigest() != ATLAS_SHA256:
        raise ValueError("Expected the unchanged, published KuroWhale atlas")
    atlas = Image.open(atlas_path).convert("RGBA")
    if atlas.size != (1536, 1872):
        raise ValueError("Expected the runtime's 8-column, 9-row atlas")
    title = ImageFont.truetype(str(args.font), 27)
    label = ImageFont.truetype(str(args.font), 19)
    small = ImageFont.truetype(str(args.font), 15)
    sheet = Image.new("RGBA", (900, 948), "#f3f4f8")
    draw = ImageDraw.Draw(sheet)
    draw.text((30, 22), "KuroWhale 黑色系鲸鱼娘桌宠", font=title, fill="#24232d")
    draw.text((30, 62), "九种状态 / Nine states · Original atlas frames", font=small, fill="#686676")
    for index, (state, chinese, row, frame) in enumerate(STATES):
        x = 24 + (index % 3) * 288
        y = 104 + (index // 3) * 272
        draw.rounded_rectangle((x, y, x + 276, y + 260), radius=16, fill="white")
        crop = atlas.crop((frame * 192, row * 208, (frame + 1) * 192, (row + 1) * 208))
        sheet.alpha_composite(crop, (x + 42, y + 2))
        draw.text((x + 138, y + 210), chinese, font=label, fill="#24232d", anchor="mt")
        draw.text((x + 138, y + 237), state, font=small, fill="#686676", anchor="mt")
    draw.text((30, 924), "Static frames · Artwork credits: NOTICE-ARTWORK.md", font=small, fill="#686676")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(args.output, optimize=True)
    print(f"Saved {args.output} ({args.output.stat().st_size:,} bytes); source atlas unchanged")


if __name__ == "__main__":
    main()
