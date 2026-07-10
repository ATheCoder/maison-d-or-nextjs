# Golden Story — AI art pipeline

How to generate illustrations that melt into the parchment pages of
`components/dailygold/GoldenStory.jsx`, matching the storybook concept art
(art painted *on* the page, fading into blank paper — no rectangular seams).

## The core idea: two modes

**Never ask the model for a transparent background** — and for the big
scene plates, **don't ask it for the paper fade either**. "Art fading into
blank paper" fights a full-bleed style reference, and the model compromises
with a small, washed-out medallion floating in empty paper. Instead:

- **Scene plates** (chapters, landscape strips, "if they were ten today"):
  generate **full-bleed** art matching the style reference — the thing
  models are best at — then let `prepare-art.py --fade 0.14` dissolve the
  outer edges into transparency with an irregular watercolor edge.
  Deterministic, identical treatment for every image, full palette kept.
- **Spot art** (timeline motifs, treasure objects): here a small subject on
  blank paper *is* the desired composition, so generate on flat uniform
  #EFE4C8 paper and let the default knockout mode lift it to real alpha
  (its unmultiply step keeps washes semi-transparent).
- **Cover**: full-bleed and opaque (the CSS gradient overlay handles the
  title). Name it `cover*.png` and the script leaves it alone.

Either way the art composites onto the site's own CSS parchment
(`#efe4c8`), so the page shows through the fades and there is no seam.

## Generator

Any strong image model works; the deciding factor across a ~15-image set is
**character consistency**, so prefer a model that accepts reference images:

- **Gemini 2.5 Flash Image ("nano banana")** — recommended. Cheap, follows
  the flat-paper instruction well, and you can pass the previous chapter's
  image with "same boy, same style, new scene" for consistency.
- **gpt-image-1** — excellent prompt adherence; the edits endpoint accepts
  reference images.
- Midjourney / Flux etc. also work (use `--cref`/style refs); the
  preprocessing is generator-agnostic.

Generate at roughly 2× display size (slot table below).

## Prompt template

Every prompt is blocks concatenated as plain prose (the block names are for
this doc only — don't send them, and square brackets mark optional parts —
don't send those either):

- scene plates & cover: STYLE (or the reference image) + SUBJECT + FULL-BLEED
- spot art: STYLE (or the reference image) + SUBJECT + PAPER

Keep every block except SUBJECT byte-identical across all images of a story.

**STYLE (fixed):**

> Richly detailed children's storybook illustration in classic European
> picture-book style: layered watercolor and gouache washes over fine
> brown-ink linework, painterly texture with deep warm shadows. Full-color
> but aged, warm palette — terracotta, chestnut brown, ochre, sage and
> olive green, dusty blue-grey, cream — bathed in glowing golden-hour
> light. Not monochrome, not sepia-toned, not line art.

**FULL-BLEED (scene plates):**

> The painting fills the entire frame, with the subject and richest
> detail concentrated toward the center. Approaching the edges of the
> frame the paint becomes progressively paler, looser and unfinished —
> thin dry washes and bare pale paper at the very edges, as if the artist
> stopped painting there. Never a circle, oval or medallion shape. No
> frame, no border, no text, no lettering, no signature.

(`--paint` turns those pale unfinished edges into genuine transparency,
so a well-behaved generation needs no `--fade` at all. If the model
regresses to a small centered medallion, drop the middle sentence and use
the edge-repaint rescue below instead. For the **cover** use the old
strict version instead:
"The painting fills the entire frame edge to edge with rich detail — no
blank margins, no vignette, no frame, no border, no text, no signature.")

**PAPER (spot art only — timeline and treasure motifs):**

> Painted directly on light cream parchment paper, a single uniform flat
> background color (#EFE4C8) with no texture, no gradients and no shadows
> in the empty areas. The scene fills almost the entire frame; only at the
> outer edges does the paint break up and dissolve into untouched blank
> paper with soft, irregular, feathered watercolor edges — never a circle,
> oval, or any geometric medallion shape, and never a small image floating
> in empty paper. No frame, no border, no text, no lettering, no signature.

Hard-learned wording notes:

- The "uniform flat background" phrase matters — the knockout keys on one
  paper color; paper *texture* comes from the page CSS, not the image.
- Don't say "sepia" or "monochrome-adjacent" words in STYLE — it collapses
  the palette to a single tea-stain hue.
- Don't ask for a "generous empty margin" or a bare "vignette" — models
  paint a tiny centered medallion. Demand the scene fill the frame and
  fade only at the edges.
- **Aspect ratio must be a generation parameter** (`aspectRatio` in the
  Gemini API, `size` for gpt-image-1, `--ar` in Midjourney) — stating it
  in the prompt text is ignored.

**Strongest lever — a style reference image** (`art/style-ref.png`, cropped
from the concept art). It replaces the STYLE block entirely; the prompt
becomes REF-HOOK + SUBJECT + PAPER with the image attached:

> Paint a new illustration in exactly the same painting style, palette,
> brushwork and level of detail as the attached reference image[, but with
> a different character]. New scene: {SUBJECT}. {FULL-BLEED or PAPER}

Reference-mode notes:

- Include "but with a different character" (no brackets) whenever the
  scene has a person, or the model will clone the reference's boy; omit
  it for figure-less scenes.
- Character consistency across chapters: once chapter 1 looks right,
  attach it as a second reference — "same painting style as the first
  image, same child as the second image, new scene: …".
- Reuse the same style-ref for every image of every story.

**Rescuing a hard edge.** When a finished image slams dark content into
the frame edge, don't dissolve it procedurally — uniform dilution reads
as mud. Send the image back through the model's edit mode:

> Keep this painting exactly as it is, but make it unfinished toward the
> edges of the frame: on all four sides the paint thins into loose, dry,
> broken strokes and bare pale paper (#EFE4C8), as if the artist stopped
> painting there. The center of the painting stays fully painted. No
> frame, no border, no vignette shape, no text.

then re-run `--paint`. The model breaks the edge up content-aware —
individual strokes, gaps, bare paper — which no procedural fade can fake.

**SUBJECT (per slot):** one or two sentences. For a recurring character,
write a fixed character sheet sentence once and paste it verbatim into every
chapter prompt, e.g.:

> Leonardo as a 12-year-old boy with shoulder-length curly brown hair,
> hazel eyes, cream linen shirt and rust-brown vest.

**Cover prompt:** STYLE + SUBJECT + "full-bleed scene filling the entire
frame edge to edge, rich background detail, muted warm tones, darker toward
the top and bottom edges" (the HTML overlays the title there).

## Slots

| Slot (data field)               | File name      | Generate at | Mode                        |
| ------------------------------- | -------------- | ----------- | --------------------------- |
| Cover (`story.image_url`)       | `cover.png`    | 1024×1536   | full-bleed, stays opaque    |
| Chapter plate (`chapters[].image_url`) | `chapter-N.png` | 1024×1536 | full-bleed → `--fade` |
| Timeline (`timeline[].image_url`)| `timeline-N.png`| 1024×1024  | spot on paper → knockout    |
| Treasure (`treasures[].image_url`)| `treasure-N.png`| 1024×1024 | spot on paper → knockout    |
| Landscape strip (childhood/treasures pages) | `strip-N.png` | 1536×640 | full-bleed → `--fade` |

## Workflow

```bash
# once
python -m venv .venv-art && .venv-art/bin/pip install numpy Pillow

# 1. generate → save raw PNGs using the names above:
#      art/raw/<slug>/scenes/  (full-bleed: cover, chapters, strips)
#      art/raw/<slug>/spots/   (flat-paper: timeline, treasures)
# 2. preprocess into webp-with-alpha:
# scenes need only --paint; if dark content slams into a frame edge,
# repaint the edges via the model's edit mode (see "Rescuing a hard
# edge"), then re-run this
.venv-art/bin/python scripts/prepare-art.py art/raw/<slug>/scenes public/stories/<slug> --paint 1.0
.venv-art/bin/python scripts/prepare-art.py art/raw/<slug>/spots  public/stories/<slug>
# 3. point the image_url fields at /stories/<slug>/<name>.webp
```

Tuning knockout mode: if faint paper haze survives in the "blank" areas,
raise `--low` (e.g. 12–16); if pale washes are getting eaten, lower
`--high` (e.g. 45). `--keep-bg` skips knockout entirely for a batch.

Tuning full-bleed mode: `--paint 0–1` is the "painted on the page" dial —
it converts the finished image into translucent pigment against the art's
own paper-white, so pale washes become genuinely see-through and the page
grain shows through the paint everywhere, not just at the edges (1 = full
effect, lower keeps more of the art's own atmosphere). `--fade` /
`--rough` / `--hold` (procedural edge dissolve) are a legacy last resort:
uniform dilution reads as mud on solidly painted edges, so prefer
generating pale unfinished edges, or the edge-repaint rescue, and let
`--paint` do the rest.

## How the template renders it

`Plate` in `GoldenStory.jsx` auto-detects pipeline art (`.webp`/`.png`
src) and switches to alpha mode: no parchment card behind the image,
`object-fit: contain`, no vignette mask, and — the crucial bit —
`mix-blend-mode: multiply`, so pale washes take on the page's own tone
and the art prints onto the parchment instead of floating over it.
The `.spread` background carries two SVG fractal-noise layers (fine fiber
grain + low-frequency mottle); because of the multiply blend the same
grain shows through the paint, which is what sells "painted on the page".
Multiply can only darken, so very luminous highlights flatten slightly —
inherent to the printed look. The cover path is unchanged (opaque,
full-bleed).
