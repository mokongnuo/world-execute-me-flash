"""Verify an exported movie against reviewed browser frames and its timestamps."""
import argparse
import json
import subprocess
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

parser = argparse.ArgumentParser()
parser.add_argument("--ffmpeg", required=True)
parser.add_argument("--ffprobe", required=True)
parser.add_argument("--video", default="dist/world-execute-me_v3_1600x900_30fps.mp4")
parser.add_argument("--reference", default="dist/review-v3-final")
parser.add_argument("--audio", default="original/Mili - world.execute (me) ;.mp3")
parser.add_argument("--out", default="dist/export-review-v3",
                    help="Separate directory for this version's verification artifacts")
parser.add_argument("--story", action="store_true", help="Also compare the rewritten dramatic scenes")
args = parser.parse_args()
video = Path(args.video).resolve()
reference = Path(args.reference)
out = Path(args.out)
out.mkdir(exist_ok=True, parents=True)


def probe(*options, media=video):
    result = subprocess.run([args.ffprobe, "-v", "error", *options, "-of", "json", str(media)],
                            check=True, capture_output=True)
    return json.loads(result.stdout)


metadata = probe("-show_streams", "-show_format")
v = next(s for s in metadata["streams"] if s["codec_type"] == "video")
a = next(s for s in metadata["streams"] if s["codec_type"] == "audio")
assert (v["width"], v["height"], v["r_frame_rate"], int(v["nb_frames"])) == (1600, 900, "30/1", 6360)
assert v["codec_name"] == "h264" and a["codec_name"] == "aac"
source_audio = probe("-show_streams", media=Path(args.audio))['streams'][0]
source_audio_duration = float(source_audio['duration'])
# Compare against the source's playable duration, not the raw MPEG-frame walk,
# which includes MP3 padding discarded by the decoder.
assert a["channels"] == 2 and abs(float(a["duration"]) - source_audio_duration) < .03
packets = probe("-select_streams", "v", "-show_packets", "-show_entries", "packet=pts_time,dts_time")["packets"]
pts = sorted(float(p["pts_time"]) for p in packets)
dts = [float(p["dts_time"]) for p in packets]
assert len(pts) == 6360
timestamp_error = max(abs(p - i/30) for i, p in enumerate(pts))
# The MP4 concat timebase can round a segment's endpoint below one millisecond.
assert timestamp_error < .002, "Missing or shifted frame timestamps"
assert all(dts[i+1] > dts[i] for i in range(len(dts)-1)), "Non-monotonic decode timestamps"

manifest = json.loads((reference / "manifest.json").read_text())
times = [9, 25.5, 84, 120.3, 123.5, 158.3, 176.2, 202.5, 206.3, 207.2, 209, 211.7]
if args.story:
    times = sorted(times + [36.5, 50.5, 65.8, 94.9, 114.9, 132.5, 186, 190.5])
samples = [next(s for s in manifest if abs(s["t"]-t) < .00001) for t in times]
indices = [round(s["t"]*30) for s in samples]
expression = "+".join(f"eq(n\\,{n})" for n in indices)
decode = subprocess.run([args.ffmpeg, "-y", "-v", "error", "-i", str(video), "-an",
                         "-vf", "select=" + expression, "-fps_mode", "vfr",
                         str(out / "frame-%02d.png")], capture_output=True)
assert decode.returncode == 0 and not decode.stderr.strip(), decode.stderr.decode(errors="replace")

checks = []
sheet = Image.new("RGB", (1600, ((len(samples) + 3) // 4) * 251), "#101722")
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 16)
for i, sample in enumerate(samples, 1):
    with Image.open(out / f"frame-{i:02d}.png") as actual, Image.open(reference / sample["file"]) as expected:
        diff = abs(np.asarray(actual.convert("RGB")).astype(float) - np.asarray(expected.convert("RGB")).astype(float))
        mask = np.asarray(expected.convert("RGB")).max(axis=2) > 60
        mean, bright = float(diff.mean()), float(diff[mask].mean())
        assert mean < 8 and bright < 12, f"Composition differs at {sample['t']}: {mean}, {bright}"
        checks.append({"t": sample["t"], "frame": indices[i-1], "mean_pixel_error": round(mean, 3),
                       "bright_pixel_error": round(bright, 3)})
        x, y = (i-1) % 4 * 400, (i-1) // 4 * 251
        sheet.paste(actual.resize((400, 225), Image.Resampling.LANCZOS), (x, y))
        draw.text((x+8, y+230), f"{sample['t']:.3f} s / frame {indices[i-1]}", font=font, fill="white")
sheet.save(out / "export-contact-sheet.jpg", quality=95)
report = {"video": str(video), "width": v["width"], "height": v["height"], "fps": 30,
          "frames": len(pts), "video_duration": float(v["duration"]),
          "audio_duration": float(a["duration"]), "video_codec": v["codec_name"],
          "source_audio_duration": source_audio_duration,
          "max_video_timestamp_error_ms": round(timestamp_error*1000, 4),
          "audio_codec": a["codec_name"], "channels": a["channels"],
          "timestamps_continuous": True, "decode_errors": False, "samples": checks}
(out / "verification.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(report, ensure_ascii=False, indent=2))
