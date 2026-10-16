"""Compose the release covers from the project's nine existing portraits.

No new character art is generated. Each aspect ratio receives its own layout.
Requires Pillow and NumPy. Outputs remain in the ignored dist directory.
"""
from collections import deque
from pathlib import Path
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "dist"
CAST = [
    ("deepseek", "DeepSeek", (78, 124, 255)),
    ("gpt", "GPT", (232, 238, 246)),
    ("claude", "Claude", (222, 124, 86)),
    ("grok", "Grok", (240, 190, 80)),
    ("kimi", "Kimi", (156, 178, 206)),
    ("gemini", "Gemini", (146, 120, 240)),
    ("glm", "智谱 GLM", (96, 196, 186)),
    ("qwen", "千问", (92, 150, 224)),
    ("doubao", "豆包", (246, 168, 150)),
]


def font(size, bold=False, mono=False):
    name = "consolab.ttf" if mono else "msyhbd.ttc" if bold else "msyh.ttc"
    return ImageFont.truetype("C:/Windows/Fonts/" + name, max(8, round(size)))


def cutout(identity):
    """Remove only near-white pixels connected to the image boundary."""
    source = Image.open(ROOT / "art" / f"girl-{identity}.jpg").convert("RGB")
    rgb = np.asarray(source)
    high = rgb.min(axis=2) >= 235
    neutral = rgb.max(axis=2).astype(int) - rgb.min(axis=2).astype(int) < 20
    eligible = high & neutral
    h, w = eligible.shape
    seen = np.zeros((h, w), dtype=bool)
    queue = deque()
    for y in range(h):
        for x in (0, w - 1):
            if eligible[y, x] and not seen[y, x]:
                seen[y, x] = True
                queue.append((x, y))
    for x in range(w):
        for y in (0, h - 1):
            if eligible[y, x] and not seen[y, x]:
                seen[y, x] = True
                queue.append((x, y))
    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and eligible[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                queue.append((nx, ny))
    alpha = Image.fromarray(np.where(seen, 0, 255).astype(np.uint8))
    result = source.convert("RGBA")
    result.putalpha(alpha)
    return result.crop(result.getbbox())


ART = {identity: cutout(identity) for identity, _, _ in CAST}


def compose(w, h):
    k = h / 1080
    yy, xx = np.mgrid[0:h, 0:w]
    cyan = np.exp(-((xx - w * .32) / (w * .5)) ** 2 - ((yy - h * .20) / (h * .6)) ** 2)
    red = np.exp(-((xx - w * .69) / (w * .5)) ** 2 - ((yy - h * .87) / (h * .6)) ** 2)
    rgb = np.zeros((h, w, 3), dtype=np.float32) + (4, 9, 17)
    rgb += cyan[..., None] * (4, 24, 40)
    rgb += red[..., None] * (37, 5, 8)
    canvas = Image.fromarray(np.uint8(np.clip(rgb, 0, 255))).convert("RGBA")
    drawing = ImageDraw.Draw(canvas)
    margin = round(35 * k)
    drawing.rounded_rectangle((margin, margin, w-margin, h-margin), radius=22*k,
                             outline=(81, 133, 154, 90), width=max(1, round(k)))
    for i in range(21):
        x = margin + i * (w - 2 * margin) / 20
        drawing.line((x, margin, x, margin + (12 if i % 5 == 0 else 5) * k),
                     fill=(76, 138, 162, 100), width=max(1, round(k)))
    # Code stays in the margins; it never forms a wall behind the cast.
    for i, text in enumerate(("if (you.return) {", "  me.change();", "  world.execute(me);", "}")):
        drawing.text((65*k, h*.20+i*31*k), text, font=font(21*k, mono=True), fill=(91, 166, 185, 64))
        drawing.text((w-410*k, h*.82+i*31*k), text, font=font(21*k, mono=True), fill=(214, 83, 93, 50))

    # Top, then clockwise: the same order used by both MV line-ups.
    positions = [(.50, .165), (.72, .255), (.88, .46), (.785, .735),
                 (.645, .79), (.355, .79), (.215, .735), (.12, .46), (.28, .255)]
    ring = [(x*w, y*h) for x, y in positions]
    layer = Image.new("RGBA", canvas.size)
    ld = ImageDraw.Draw(layer)
    for i, (x, y) in enumerate(ring):
        nx, ny = ring[(i+1) % 9]
        col = CAST[i][2]
        ld.line((x, y, nx, ny), fill=col+(42,), width=max(1, round(2*k)))
        tx, ty = x*.36+nx*.64, y*.36+ny*.64
        angle = math.atan2(ny-y, nx-x)
        ld.polygon([(tx, ty), (tx-13*k*math.cos(angle-.48), ty-13*k*math.sin(angle-.48)),
                    (tx-13*k*math.cos(angle+.48), ty-13*k*math.sin(angle+.48))], fill=col+(115,))
        radius = 105*k
        ld.ellipse((x-radius, y-radius, x+radius, y+radius), fill=col+(50,))
    canvas = Image.alpha_composite(canvas, layer.filter(ImageFilter.GaussianBlur(22*k)))
    canvas = Image.alpha_composite(canvas, layer)

    for i, (identity, name, col) in enumerate(CAST):
        x, y = ring[i]
        target_h = (200 if identity == "doubao" else 270 if i in (4, 5) else 300 if i == 0 else 314) * k
        portrait = ART[identity]
        scale = target_h / portrait.height
        portrait = portrait.resize((round(portrait.width*scale), round(target_h)), Image.Resampling.LANCZOS)
        px, py = round(x-portrait.width/2), round(y-portrait.height/2)
        shadow = Image.new("RGBA", canvas.size)
        tint = Image.new("RGBA", portrait.size, col+(0,))
        tint.putalpha(portrait.getchannel("A"))
        shadow.alpha_composite(tint, (px, py))
        canvas = Image.alpha_composite(canvas, shadow.filter(ImageFilter.GaussianBlur(8*k)))
        canvas.alpha_composite(portrait, (px, py))
        drawing = ImageDraw.Draw(canvas)
        label_y = py + portrait.height + 12*k
        label_font = font(25*k, bold=True)
        bbox = drawing.textbbox((0, 0), name, font=label_font)
        lw = bbox[2]-bbox[0]+26*k
        drawing.rounded_rectangle((x-lw/2, label_y-2*k, x+lw/2, label_y+35*k),
                                 radius=9*k, fill=(4, 9, 17, 220))
        drawing.text((x, label_y), name, font=label_font, anchor="mt", fill=col+(255,))

    # Headline occupies the open center rather than covering the bottom cast.
    drawing = ImageDraw.Draw(canvas)
    title_size = min(156*k, w*.108)
    title_font = font(title_size, bold=True)
    for text, y, color in (("如果爱是", h*.35, (243, 248, 250, 255)),
                           ("一条指令", h*.505, (255, 103, 117, 255))):
        drawing.text((w/2, y), text, font=title_font, anchor="mt", fill=color,
                     stroke_width=max(2, round(3*k)), stroke_fill=(3, 8, 16, 255))
    drawing.text((w/2, h*.684), "九位AI娘化 × Mili", font=font(33*k, bold=True),
                 anchor="mt", fill=(218, 233, 240, 255))
    drawing.text((w/2, h*.729), "world.execute(me);", font=font(27*k, mono=True),
                 anchor="mt", fill=(125, 192, 204, 255))
    drawing.text((70*k, 62*k), "world.execute(me);", font=font(28*k, mono=True), fill=(179, 223, 235, 255))
    drawing.text((w-70*k, 62*k), "ANIMATED MUSIC VIDEO", font=font(20*k, mono=True),
                 anchor="rt", fill=(141, 175, 193, 230))
    output = OUT / f"cover_v2_{w}x{h}.png"
    canvas.convert("RGB").save(output)
    thumbnail = canvas.convert("RGB")
    thumbnail.thumbnail((480, 300), Image.Resampling.LANCZOS)
    thumbnail.save(OUT / f"cover_v2_{w}x{h}_thumb.jpg", quality=95)
    print(output)


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    compose(1920, 1080)
    compose(1146, 717)
