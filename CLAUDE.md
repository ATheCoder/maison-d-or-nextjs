@AGENTS.md

Tailwind is version 4.

# Design system — read before building any UI

This app has ONE design language. Do not invent button/input/heading styles on new pages.

- All interactive controls and typography come from `components/ds` — import from the barrel: `import { Button, Heading, Field, Card, Prose, TextLink } from '@/components/ds'`. Read the docstring in `components/ds/Button.tsx` before styling any control.
- Never write a raw `<button>`, `<input>`, `<select>`, `<textarea>`, `<h1>`–`<h6>`, or styled `<a>` in app pages. `components/ds/primitives.contract.test.ts` enforces this on `app/(dg)`, `app/(front-door)`, and `app/admin`; new surfaces must follow the same rule (and should be added to that test).
- A link that looks like a button: `<Button href=...>` or `buttonClasses()` on a `next/link`.
- Colors: only the semantic CSS variables from `app/globals.css` (`--btn-*`, `--palette-*`), which are re-scoped per `[data-surface]`/`[data-theme]`. Never hardcode hex in components.
- Typography: the `type-*` utilities from `app/globals.css` (`type-body-ui`, `type-caption`, `type-label-editorial`, `type-display-*`, `type-quote`).
- Live style guide at `/design` (`app/design/page.tsx`).

Deliberate exceptions — do NOT imitate their styling on new pages, and do NOT "fix" them: Treasury (`components/treasury`), Observatory (`components/observatory`), the Daily Gold gallery's `GALLERY_CSS`/`NAV_SHELL_CSS` geometry, the admin desk's private `const CSS` blocks, the auth rooms (`FamilyManager`, `GateForm`, `ProfilePicker`), the homepage's legacy `.mdo-btn`, and `components/ui/DatePicker.tsx`.

`.design-sync/` is the export pipeline that bundles the presentational components for an external design tool (see `.design-sync/NOTES.md`); its `conventions.md` describes the same design system from the bundle consumer's side. The `.design-sync/redesigns/` HTML mockups are historical explorations — never a styling reference for app code.
