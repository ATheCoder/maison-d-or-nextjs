#!/usr/bin/env python3
"""
prepare-art.py — batch-prepare AI-generated Golden Story art for the web.

Two modes (see docs/golden-story-art-pipeline.md for prompts):

  default   spot art generated on a *flat uniform* light-parchment background:
            knock the paper out to real alpha (scripts/remove-bg.py) and trim
            to the artwork plus a small margin;
  --fade F  full-bleed art: keep everything, but dissolve the outer F of the
            frame into transparency with an irregular watercolor-style edge.

Files named cover* stay opaque either way (the cover is full-bleed in the
template). Everything is downscaled to --max px long edge and exported as
WebP with alpha into OUTPUT under the same basename.

Usage:
  python scripts/prepare-art.py art/raw/leonardo public/stories/leonardo
  python scripts/prepare-art.py chapter-1.png public/stories/leonardo --high 70

Deps: pip install numpy Pillow
"""
import argparse
import importlib.util
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

# remove-bg.py has a dash in its name, so load it as a module by path.
_HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("removebg", _HERE / "remove-bg.py")
removebg = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(removebg)

EXTS = {".png", ".jpg", ".jpeg", ".webp"}


def trim_to_art(img, margin=14, thresh=8):
    """Crop an RGBA image to the opaque-ish region, keeping a paper margin."""
    mask = img.getchannel("A").point(lambda a: 255 if a > thresh else 0)
    bbox = mask.getbbox()
    if not bbox:
        return img
    left, top, right, bottom = bbox
    return img.crop((
        max(0, left - margin),
        max(0, top - margin),
        min(img.width, right + margin),
        min(img.height, bottom + margin),
    ))


def _noise(rng, w, h, cell, blur):
    cells = rng.random((max(2, h // cell), max(2, w // cell))).astype(np.float32)
    return np.asarray(
        Image.fromarray((cells * 255).astype(np.uint8))
        .resize((w, h), Image.BICUBIC)
        .filter(ImageFilter.GaussianBlur(blur)),
        np.float32,
    ) / 255.0


def extract_paint(img, strength=1.0):
    """Turn a finished full-bleed painting back into translucent pigment,
    so the HTML page acts as the paper it was painted on. The artwork's own
    paper-white is estimated from its brightest pixels; each pixel's alpha
    becomes its pigment density below that white, and the pigment colour is
    unmultiplied. strength<1 blends back toward the opaque original."""
    img = img.convert("RGBA")
    rgb = np.asarray(img.convert("RGB"), np.float32)
    lum = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
    bright = rgb[lum >= np.percentile(lum, 96)]
    paper = np.median(bright, axis=0)
    density = np.clip((paper - rgb) / np.maximum(paper, 1.0), 0, 1).max(axis=2)
    a = np.clip(strength * density + (1 - strength), 1e-3, 1)[..., None]
    pigment = np.clip((rgb - paper * (1 - a)) / a, 0, 255)
    old = np.asarray(img.getchannel("A"), np.float32)[..., None] / 255.0
    return Image.fromarray(
        np.dstack([pigment, a * old * 255.0]).astype(np.uint8), "RGBA"
    )


def fade_edges(img, fade=0.14, rough=0.5, hold=0.55, seed=0):
    """Give a full-bleed image an irregular watercolor-style alpha fade at
    the edges, so it dissolves into the page parchment when composited.
    `hold` keeps dark ink strokes alive deeper into the fade band than pale
    washes, so the paint ends in broken strokes instead of a uniform veil."""
    img = img.convert("RGBA")
    w, h = img.size
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    # 0 at the frame edge -> 1 at `fade` of the way in
    dx = np.minimum(xx, w - 1 - xx) / max(1.0, w * fade)
    dy = np.minimum(yy, h - 1 - yy) / max(1.0, h * fade)
    base = np.clip(np.minimum(dx, dy), 0, 1)
    # blotchy low-frequency noise + a finer octave make the edge organic
    rng = np.random.default_rng(seed)
    noise = (_noise(rng, w, h, 90, min(w, h) * 0.01)
             + 0.35 * (_noise(rng, w, h, 24, 2) - 0.5))
    t = np.clip(base - (noise - 0.5) * rough * base * (1 - base) * 4, 0, 1)
    alpha = t * t * (3 - 2 * t)  # smoothstep
    if hold > 0:
        rgb = np.asarray(img.convert("RGB"), np.float32) / 255.0
        dark = np.clip(1 - rgb @ np.array([0.299, 0.587, 0.114], np.float32),
                       0, 1) ** 1.5
        guard = np.clip(base * 3, 0, 1)          # nothing survives the rim
        guard = guard * guard * (3 - 2 * guard)
        alpha = np.clip(alpha + dark * hold * (1 - alpha) * guard, 0, 1)
    old = np.asarray(img.getchannel("A"), np.float32) / 255.0
    img.putalpha(Image.fromarray((alpha * old * 255).astype(np.uint8)))
    return img


def prepare(src, dst, args):
    img = Image.open(src)
    cover = src.stem.lower().startswith("cover")
    if cover or args.keep_bg:
        img = img.convert("RGB")
        note = "kept opaque"
    elif args.fade > 0 or args.paint > 0:
        # full-bleed art: back to translucent pigment, then dissolve edges
        note = []
        if args.paint > 0:
            img = extract_paint(img, strength=args.paint)
            note.append(f"pigment {args.paint:.0%}")
        if args.fade > 0:
            img = fade_edges(img, fade=args.fade, rough=args.rough,
                             hold=args.hold, seed=hash(src.stem) & 0xFFFF)
            note.append(f"edge fade {args.fade:.0%}")
        note = ", ".join(note)
    else:
        # spot art on flat paper: knock the paper out to alpha
        img, paper = removebg.knockout(
            img, low=args.low, high=args.high, feather=args.feather
        )
        img = trim_to_art(img, margin=args.margin)
        note = f"knocked out paper rgb{tuple(int(x) for x in paper)}"
    if max(img.size) > args.max:
        img.thumbnail((args.max, args.max), Image.LANCZOS)
    img.save(dst, "WEBP", quality=args.quality, method=6)
    print(f"{src.name} -> {dst}  ({img.width}x{img.height}, {note})")


def main():
    p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    p.add_argument("input", type=Path, help="image file or directory of images")
    p.add_argument("output", type=Path, help="output directory")
    p.add_argument("--max", type=int, default=1600, help="max long edge px")
    p.add_argument("--quality", type=int, default=90, help="webp quality")
    p.add_argument("--margin", type=int, default=14, help="trim margin px")
    p.add_argument("--keep-bg", action="store_true",
                   help="skip background knockout for all files")
    p.add_argument("--fade", type=float, default=0, metavar="FRAC",
                   help="full-bleed mode: fade edges to alpha over this "
                        "fraction of the frame instead of knocking out the "
                        "background (try 0.14)")
    p.add_argument("--paint", type=float, default=0, metavar="STRENGTH",
                   help="full-bleed mode: convert the whole image to "
                        "translucent pigment on the page (1 = full "
                        "color-to-alpha against the art's own paper-white, "
                        "try 0.85)")
    p.add_argument("--rough", type=float, default=0.5,
                   help="fade edge irregularity, 0 = smooth (with --fade)")
    p.add_argument("--hold", type=float, default=0.55,
                   help="how strongly dark strokes persist into the fade "
                        "band, 0 = uniform veil (with --fade)")
    # knockout tuning, passed through to remove-bg.py
    p.add_argument("--low", type=float, default=8)
    p.add_argument("--high", type=float, default=60)
    p.add_argument("--feather", type=float, default=0.8)
    args = p.parse_args()

    srcs = (sorted(f for f in args.input.iterdir() if f.suffix.lower() in EXTS)
            if args.input.is_dir() else [args.input])
    if not srcs:
        sys.exit(f"no images found in {args.input}")
    args.output.mkdir(parents=True, exist_ok=True)
    for src in srcs:
        prepare(src, args.output / (src.stem + ".webp"), args)


if __name__ == "__main__":
    main()
