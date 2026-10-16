"""Typeset the dragon/whale revision cover from the existing editable artwork.

Reuses the original character cutouts; each release ratio is composed separately.
Run with Python + Pillow + NumPy, alongside cover.py. No generated character art.
"""
from pathlib import Path
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from cover import ART, CAST, font, OUT


def text_center(canvas, text, x, y, size, color, stroke=0, mono=False):
    draw = ImageDraw.Draw(canvas)
    draw.text((round(x), round(y)), text, font=font(size, bold=True, mono=mono),
              fill=color, anchor="mm", stroke_width=round(stroke),
              stroke_fill=(12, 12, 27, 255))


def hero(canvas, identity, center_x, top, height, bottom, color):
    src = ART[identity]
    scale = height / src.height
    portrait = src.resize((round(src.width * scale), round(height)), Image.Resampling.LANCZOS)
    x, y = round(center_x - portrait.width / 2), round(top)
    mask = portrait.getchannel("A")
    # The portrait ends in a deliberate fade into the headline zone, not a cut edge.
    ramp = np.arange(portrait.height, dtype=float) + y
    ramp = np.clip((bottom - ramp) / (height * .14), 0, 1)
    alpha = np.asarray(mask).astype(float) * ramp[:, None]
    mask = Image.fromarray(alpha.astype(np.uint8))
    portrait.putalpha(mask)
    rim = Image.new("RGBA", portrait.size, color + (0,))
    rim.putalpha(mask.filter(ImageFilter.MaxFilter(7)))
    layer = Image.new("RGBA", canvas.size)
    layer.alpha_composite(rim, (x, y))
    canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(height * .012)))
    canvas.alpha_composite(portrait, (x, y))


def cast_strip(canvas, w, h, k):
    draw = ImageDraw.Draw(canvas)
    y0 = h * .745
    draw.rectangle((0, y0, w, h), fill=(7, 14, 29, 255))
    draw.line((w*.035, y0, w*.965, y0), fill=(135, 166, 215, 110), width=max(1, round(k)))
    text_center(canvas, "九位 AI 娘化 × Mili", w*.5, h*.785, 30*k, (235, 240, 252, 255))
    remaining = [item for item in CAST if item[0] not in ("gpt", "deepseek")]
    step = w * .81 / 7
    cy, diameter = h*.899, h*.137
    for i, (identity, _, col) in enumerate(remaining):
        cx = w*.095 + step * (i+.5)
        size = round(diameter)
        # Crop the actual portraits as close-up cameos so all seven read on mobile.
        src = ART[identity]
        crop_h = min(src.height, round(src.width * 1.02))
        crop = src.crop((0, 0, src.width, crop_h))
        thumb = crop.resize((size, size), Image.Resampling.LANCZOS)
        circle = Image.new("L", (size, size))
        ImageDraw.Draw(circle).ellipse((0, 0, size-1, size-1), fill=255)
        alpha = np.minimum(np.asarray(thumb.getchannel("A")), np.asarray(circle))
        thumb.putalpha(Image.fromarray(alpha.astype(np.uint8)))
        draw = ImageDraw.Draw(canvas)
        r = diameter/2
        draw.ellipse((cx-r-3*k, cy-r-3*k, cx+r+3*k, cy+r+3*k), fill=col+(255,))
        draw.ellipse((cx-r, cy-r, cx+r, cy+r), fill=(25, 32, 49, 255))
        canvas.alpha_composite(thumb, (round(cx-r), round(cy-r)))


def compose(w, h):
    k = h / 717
    yy, xx = np.mgrid[0:h, 0:w]
    left = np.exp(-((xx/w-.23)/.30)**2 - ((yy/h-.33)/.40)**2)
    right = np.exp(-((xx/w-.80)/.30)**2 - ((yy/h-.33)/.42)**2)
    middle = np.exp(-((xx/w-.50)/.19)**2 - ((yy/h-.46)/.27)**2)
    rgb = np.zeros((h, w, 3), dtype=np.float32) + (6, 10, 27)
    rgb += left[..., None] * (38, 22, 69)
    rgb += right[..., None] * (0, 48, 88)
    rgb += middle[..., None] * (47, 3, 17)
    canvas = Image.fromarray(np.uint8(np.clip(rgb, 0, 255))).convert("RGBA")
    d = ImageDraw.Draw(canvas)
    # A single diagonal edit mark supplies movement. Sparse rules leave the art clear.
    d.polygon([(w*.55, h*.10), (w*.64, h*.10), (w*.43, h*.71), (w*.38, h*.71)],
              fill=(239, 70, 106, 25))
    d.line((w*.568, h*.10, w*.409, h*.71), fill=(248, 112, 151, 170), width=round(3*k))
    for side, color in ((.04, (191, 174, 240, 90)), (.96, (110, 191, 255, 90))):
        x = w*side
        direction = 1 if side < .5 else -1
        d.line((x, h*.13, x+direction*w*.09, h*.13), fill=color, width=round(2*k))
        d.line((x, h*.13, x, h*.67), fill=color, width=max(1, round(k)))

    # The large portraits use the exact existing dragon and whale-maid drawings.
    hero(canvas, "gpt", w*.225, h*.107, h*.98, h*.738, (203, 180, 255))
    hero(canvas, "deepseek", w*.793, h*.112, h*.94, h*.738, (65, 159, 255))

    # Identity labels: the model is now part of the selected headline, not a footer credit.
    text_center(canvas, "GPT-6 Astra", w*.235, h*.067, 38*k, (239, 230, 255, 255), 1.6*k)
    text_center(canvas, "DeepSeek", w*.789, h*.067, 39*k, (184, 226, 255, 255), 1.6*k)

    # A typographic edit stamp in the free space between the two faces.
    stamp = Image.new("RGBA", (round(390*k), round(220*k)))
    sd = ImageDraw.Draw(stamp)
    sw, sh = stamp.size
    sd.polygon([(13*k, 36*k), (sw-29*k, 23*k), (sw-9*k, sh-40*k), (25*k, sh-25*k)],
               fill=(11, 12, 31, 230))
    sd.line((31*k, sh-27*k, sw-17*k, sh-38*k), fill=(255, 94, 119, 255), width=round(9*k))
    text_center(stamp, "怒改", sw*.5, sh*.49, 142*k, (255, 93, 120, 255), 5*k)
    stamp = stamp.rotate(7, resample=Image.Resampling.BICUBIC, expand=True)
    canvas.alpha_composite(stamp, (round(w*.50-stamp.width/2), round(h*.40-stamp.height/2)))

    text_center(canvas, "龙娘", w*.232, h*.65, 76*k, (246, 238, 255, 255), 4*k)
    text_center(canvas, "大肥鱼", w*.79, h*.65, 76*k, (210, 242, 255, 255), 4*k)
    # Song name forms the bridge from the playful headline to the actual MV.
    text_center(canvas, "world.execute(me);", w*.5, h*.707, 27*k, (226, 218, 239, 255), 1*k, True)
    cast_strip(canvas, w, h, k)

    output = OUT / f"cover_dragon_whale_{w}x{h}.png"
    canvas.convert("RGB").save(output)
    thumb = canvas.convert("RGB")
    thumb.thumbnail((480, 300), Image.Resampling.LANCZOS)
    thumb.save(OUT / f"cover_dragon_whale_{w}x{h}_thumb.jpg", quality=96)
    print(output)


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    compose(1146, 717)
    compose(1920, 1080)
