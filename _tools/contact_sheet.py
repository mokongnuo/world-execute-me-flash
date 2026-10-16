"""Make review contact sheets from the browser-rendered manifest."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

parser = argparse.ArgumentParser()
parser.add_argument("directory", nargs="?", default="dist/review-v3-final")
args = parser.parse_args()
directory = Path(args.directory)
samples = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
font = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 17)
for group, items in (("keys", [s for s in samples if s["scene"].startswith("key-")]),
                     ("scenes", [s for s in samples if not s["scene"].startswith("key-")])):
    for page, start in enumerate(range(0, len(items), 24), 1):
        batch = items[start:start + 24]
        sheet = Image.new("RGB", (1600, ((len(batch) + 3) // 4) * 251), "#101722")
        draw = ImageDraw.Draw(sheet)
        for index, sample in enumerate(batch):
            x, y = index % 4 * 400, index // 4 * 251
            with Image.open(directory / sample["file"]) as frame:
                sheet.paste(frame.resize((400, 225), Image.Resampling.LANCZOS), (x, y))
            draw.text((x + 6, y + 229), f'{sample["t"]:07.3f}  {sample["scene"]}', fill="white", font=font)
        sheet.save(directory / f"sheet-{group}-{page}.jpg", quality=93)
        print(directory / f"sheet-{group}-{page}.jpg")
