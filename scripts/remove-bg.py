#!/usr/bin/env python3
"""
knockout.py — make the paper/flat background of an illustration transparent.

Approach: auto-detect the paper colour from the image border, then set each
pixel's alpha from its distance to that colour (paper -> transparent, paint ->
opaque). Optionally "unmultiply" partial-alpha pixels to remove paper-tinted
fringing. Works well for watercolour / ink / sketches on uniform light paper.
"""
import argparse, numpy as np
from PIL import Image, ImageFilter


def detect_paper(rgb, border=0.04):
    h, w = rgb.shape[:2]
    b = max(2, int(min(h, w) * border))
    edge = np.concatenate([
        rgb[:b].reshape(-1, 3), rgb[-b:].reshape(-1, 3),
        rgb[:, :b].reshape(-1, 3), rgb[:, -b:].reshape(-1, 3),
    ])
    return np.median(edge, axis=0)


def knockout(img, paper=None, low=8, high=60, feather=0.8,
             unmultiply=True, border=0.04):
    rgb = np.asarray(img.convert("RGB")).astype(np.float32)
    paper = detect_paper(rgb, border) if paper is None else np.array(paper, np.float32)

    # distance to paper, per pixel (max channel diff is punchier than euclidean)
    dist = np.max(np.abs(rgb - paper), axis=2)
    alpha = np.clip((dist - low) / max(1e-6, (high - low)), 0, 1)

    if feather > 0:
        alpha = np.asarray(
            Image.fromarray((alpha * 255).astype(np.uint8))
            .filter(ImageFilter.GaussianBlur(feather))
        ).astype(np.float32) / 255.0

    out = rgb.copy()
    if unmultiply:
        # pixel = art*alpha + paper*(1-alpha)  ->  recover art where alpha>0
        a = np.clip(alpha, 1e-3, 1)[..., None]
        out = np.clip((rgb - paper * (1 - a)) / a, 0, 255)

    rgba = np.dstack([out, alpha * 255]).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA"), paper


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("input")
    p.add_argument("output")
    p.add_argument("--paper", type=int, nargs=3, default=None,
                   help="paper RGB, e.g. --paper 237 228 200 (default: auto)")
    p.add_argument("--low", type=float, default=8,
                   help="distance below which a pixel is fully paper (transparent)")
    p.add_argument("--high", type=float, default=60,
                   help="distance above which a pixel is fully opaque")
    p.add_argument("--feather", type=float, default=0.8, help="edge blur px")
    p.add_argument("--no-unmultiply", action="store_true")
    a = p.parse_args()
    out, paper = knockout(Image.open(a.input), a.paper, a.low, a.high,
                          a.feather, not a.no_unmultiply)
    out.save(a.output)
    print(f"paper={tuple(int(x) for x in paper)}  ->  {a.output}")