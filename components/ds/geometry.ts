/**
 * The resting size of a control, in numbers rather than in CSS.
 *
 * The coats own the real thing (`field` and the btn-* utilities in
 * globals.css §4); these exist for the one job a class cannot do — letting a
 * SKELETON hold the exact shape the real control will land into. Without a
 * shared source the two guess separately and drift, which is what happened
 * before: every auth skeleton had its own idea of how tall a field was.
 *
 * Measured off the coats, not chosen:
 *
 *   height = py-2.5 (0.625rem × 2 = 20px)
 *          + type-body-ui (0.9375rem × line-height 1.5 = 22.5px)
 *          + border (1px × 2)
 *          = 44.5px
 *
 * Field and Button come out identical — same vertical padding, same type
 * token, same hairline — which is why there is one pair of constants here
 * and not two. Recompute if the padding or the type token moves; that is the
 * whole maintenance burden, and it is why the arithmetic is written out.
 */

/** --radius-md. Buttons, fields and cards all speak in it (§4). */
export const CONTROL_RADIUS = 10;

/** 44.5px, rounded up — a skeleton that is half a pixel short still reflows. */
export const CONTROL_HEIGHT = 45;
