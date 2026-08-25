# Maison d'Oré — Golden Stories Bible

**Status: the standard.** This document owns the editorial and visual standard for
every Golden Story. Where it disagrees with `golden-story-specification.md` (v1),
this document wins.

The benchmark is always **Little People, BIG DREAMS**. Before approving any story,
compare it to that standard: beautiful, emotionally engaging, intelligent,
memorable and simple enough for a child to understand — but never dumbed down or
babyish.

> The goal is not to give children lots of information.
> The goal is to make them want to know more.

---

## The writing

Keep the text relatively short. We don't need more words; we need better words.

Every spread should contain at least one memorable fact, moment or idea that a
child could tell somebody afterwards.

Avoid generic sentences such as "She wrote a great book," "He was very brave," or
"She loved nature." Instead, show the thing that made the person extraordinary
through specific, fascinating facts.

The child should regularly have a "Wait… really?" moment.

Never write down to children. The language can be simple, but the ideas should be
intelligent. Ideally, an 8-year-old understands it, a 12-year-old genuinely enjoys
it, and a parent reading over their shoulder learns something too.

Every story should have a narrative arc rather than feeling like a Wikipedia
biography:

    childhood → curiosity/problem → important moments → obstacles →
    breakthrough/contribution → legacy → what we can take from their life

Include the strange, surprising and human details. Tiny inventions, failures,
secrets, unusual habits, childhood ideas, obstacles, historical context — these
are often what children remember.

### Factual accuracy is non-negotiable

Every historical claim, date, quote, relationship, achievement and anecdote must
be fact-checked. Never invent dialogue or present speculation as fact.

If we include something playful such as "If Emily Were Here Today…", clearly
signal that we're imagining. That feature stays — the connection between
historical people and a modern child's world is worth keeping — but it must never
blur imagination with biography.

---

## Recurring elements

Golden Stories should generally include:

- A beautiful opening/title spread
- The person's childhood/origin
- Their world and what shaped them
- Memorable and surprising facts
- Challenges or important turning points
- What they created/discovered/changed
- A visual life timeline
- What they left behind / their legacy
- *If They Were Here Today*, when appropriate
- A very short takeaway/reflection
- A beautiful final line

We don't need to force every element into every person if it doesn't fit.
**Story first, template second.**

---

## Visual standard

Every spread should feel like an illustrated collectible book, not an educational
website.

Think *Little People, BIG DREAMS* meets Maison d'Oré: warm, cinematic, timeless,
editorial, tactile and beautiful enough that a parent would want the physical book
on a shelf.

The illustrations should support the actual story being told on that spread,
rather than simply being decorative.

### The table

When the book opens it lies on a beautiful wooden table — not on a plain black
background. The wood is elegant, natural and understated: warm, slightly aged,
sophisticated. Not orange, not rustic, not busy. **The book remains the hero.**
Think of opening an old beautiful book on a quiet library or family table.

It should subtly feel three-dimensional: the open book, its edges and shadow, and
the wooden surface underneath. Children should feel as though they are opening a
real book, not viewing pages inside a browser.

---

## The test for every Golden Story

Before approving it, ask:

1. Would this feel at home beside *Little People, BIG DREAMS*?
2. Did we respect the child's intelligence?
3. Is there something genuinely fascinating on every spread?
4. Will the child remember at least 2–3 things tomorrow?
5. Is every factual statement trustworthy?
6. Does it feel like Maison d'Oré rather than schoolwork?
7. Would a parent enjoy reading it too?

If the answer isn't yes, it isn't finished.

**The overall goal:** Golden Stories should make children fall in love with
remarkable people, history and ideas without ever feeling like they're being
taught. Beautiful enough to collect. Intelligent enough to grow with them.
Fascinating enough to make them turn the page.

---

## Standing decisions

These were settled when the bible was adopted (2026-08-25) and are not open
questions. They exist here so nobody re-litigates them from the code.

**1. The bible applies going forward only.**
The four stories generated before it (leonardo, albert-einstein, marie-curie,
rembrandt-van-rijn) are *not* regenerated. They keep the pre-bible reading level
and the pre-bible page shapes. Do not "fix" them to match, and do not read them as
examples of the standard.

**2. Fact-checking warns; it never blocks publishing.**
An unverifiable claim is surfaced loudly in the editor — the admin decides. The
`published` flag is never gated on a fact-check verdict. Rationale: the admin is
the family's owner and the only user; a hard gate would cost more than it caught.
This mirrors the Daily Gold desk, where R3.19 marks an item *unverifiable* rather
than dropping it.

**3. The bible overrides the wordless final chapter.**
The last chapter used to render as a full-page painting with its narrative written
but deliberately not displayed — a spread carrying nothing a child could tell
somebody afterwards. That exception is retired: the final chapter keeps the
full-bleed dramatic art and now carries its text over it. Stories generated before
this ruling still hold `page_span: "image"` and still render wordless; that is
decision 1, not a bug.

---

## Where this lives in the code

| The bible says | Enforced in |
|---|---|
| House voice, reading level, generic-sentence ban, the arc | `WRITER_SYSTEM` — `lib/golden-story/brief.ts` |
| A memorable fact on every spread | `fact` on `Brief` chapters/sections (`brief.ts`), `Chapter`/`StorySection` (`src/db/schema.ts`), rendered by `components/dailygold/GoldenStory.jsx`, flagged when missing by `components/admin/personSections.ts` |
| Factual accuracy | `lib/golden-story/factcheck.ts`, surfaced in `components/admin/PersonEditor.tsx` |
| Signal the imagining | The *If X Were 10 Today* spread in `GoldenStory.jsx` |
| Art supports the spread's story | The scene blocks in `lib/golden-story/prompts.ts` |
| The wooden table | `.wood-table` in `app/globals.css`, worn by `GoldenStory.module.css`, `PersonEditor.module.css` and `BookOpeningCurtain.jsx` |
| The seven questions | The publish checklist in `PersonEditor.tsx` |
