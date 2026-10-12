"""_tools/assemble.py - cut the contact sheets back into a moving picture.

The frames were photographed as grids (see _tools/reel.js and _tools/reel.ps1),
because the film is a pure function of t and one browser launch can therefore
shoot twelve instants at once. This slices them back out in order and writes an
animated WebP (and a GIF beside it, which is the format every renderer will
play). Each clip keeps its own frame rate: the overexposure lives for about a
fifth of a second, so it is shot at 20 fps while the rest is at 12.
"""
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REEL = os.path.join(ROOT, "frames", "reel")


def main(manifest_path):
    with open(manifest_path, "r", encoding="utf-8") as fh:
        plan = json.load(fh)
    cols, rows = plan["cols"], plan["rows"]
    cw, ch = plan["cw"], plan["ch"]

    frames, durs, names = [], [], []
    for sh in plan["sheets"]:
        path = os.path.join(REEL, sh["file"])
        sheet = Image.open(path).convert("RGB")
        want = (cols * cw, rows * ch)
        if sheet.size != want:
            print("  ! %s is %s, expected %s" % (sh["file"], sheet.size, want))
        for i in range(sh["count"]):
            r, c = divmod(i, cols)
            frames.append(sheet.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)).copy())
            durs.append(sh["dur"])
            names.append(sh["clip"])

    print("  %d frames, %d clips, %.1f s" % (len(frames), len(set(names)),
          sum(durs) / 1000.0))

    webp = os.path.join(REEL, "world-execute-me-reel.webp")
    frames[0].save(webp, save_all=True, append_images=frames[1:],
                   duration=durs, loop=0, quality=82, method=6)
    print("  wrote %s  (%.2f MB)" % (webp, os.path.getsize(webp) / 1e6))

    small = [f.resize((600, 338), Image.LANCZOS) for f in frames]
    gif = os.path.join(REEL, "world-execute-me-reel.gif")
    small[0].save(gif, save_all=True, append_images=small[1:],
                  duration=durs, loop=0, optimize=True)
    print("  wrote %s  (%.2f MB)" % (gif, os.path.getsize(gif) / 1e6))


if __name__ == "__main__":
    main(sys.argv[1])
