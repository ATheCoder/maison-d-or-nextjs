'use client';
/**
 * DGEditionSkeleton — the walls before the paintings: what the reader sees
 * while the edition itself is still being fetched.
 *
 * Rendered by app/(dg)/daily-gold-edition/loading.tsx, which Next.js mounts
 * inside the group layout's <main class="dg-shell"> — so the rail, the tab bar
 * and the identity header are never replaced, only the reading column is.
 * Being inside `.dg-root` also means three things are already ours and must not
 * be re-declared here: `--dg-gold` (set on the root by the chrome), the
 * `dgFadeIn` keyframe from NAV_SHELL_CSS, and that stylesheet's blanket
 * `prefers-reduced-motion` clamp, which flattens every animation below to a
 * still frame without this file saying a word about it.
 *
 * Unlike DGContentSkeleton — which stands in for any destination in the (dg)
 * group and so stays deliberately generic — this one knows exactly which page
 * is coming, and mirrors it wall for wall in the real order: the entrance, the
 * destination wall and its four senses, the portrait wall, the salon hang, the
 * year room, the ledger. The geometry is not approximated: it wears GALLERY_CSS's
 * own classes, so the frames land at the same aspects, in the same columns, at
 * the same gutter as the real works — the whole point being that when the day
 * arrives nothing under the reader's eye jumps or reflows.
 *
 * It models the common case and cannot know three things the day decides, all
 * accepted: the signed-out CTA / welcome flourish that can sit above the
 * entrance (session state is the page's business), how many works each wall
 * actually holds, and whether the reader's ground is one of the two dark ones,
 * where the entrance's words stand *in* the painting rather than beneath it.
 *
 * Accessibility: the whole frame is one `role="status"` with a single sr-only
 * sentence. Every visible part below is `aria-hidden`, so a screen reader hears
 * "Preparing today's edition" once instead of a reading of forty grey blocks.
 */
import { Bar, SKELETON_CSS } from './DGContentSkeleton';
import { GALLERY_CSS } from './galleryCss';

/**
 * Custom properties are not in React's CSSProperties, and `--ar` and `--cols`
 * are how GALLERY_CSS is parameterised — so every frame here has to set one.
 *
 * @param {Record<string, string | number>} o
 * @returns {import('react').CSSProperties}
 */
const vars = (o) => /** @type {import('react').CSSProperties} */ (o);

/** The shimmer's ground — `.dg-skel`'s own fill, restated where a real class wins. */
const SKEL_FILL = 'color-mix(in srgb, var(--dg-gold) 12%, transparent)';

/**
 * A wax seal with nowhere to go — the navigator's own *disabled* medallion,
 * down to the cream radial, the 20%-gold ring and the inner emboss ring, all
 * under the same 0.35 opacity.
 */
function GhostSeal() {
  return (
    <div style={{
      position: 'relative',
      width: 48,
      height: 48,
      borderRadius: '50%',
      background: 'radial-gradient(circle at 35% 30%, #F0EAE0 0%, #E0D8CC 60%, #D4CBBC 100%)',
      border: '2px solid color-mix(in srgb, var(--palette-gold) 20%, transparent)',
      opacity: 0.35,
      flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', inset: 4, borderRadius: '50%',
        border: '1px solid color-mix(in srgb, var(--palette-gold) 10%, transparent)',
      }} />
    </div>
  );
}

/**
 * An empty frame with an empty label beneath it — one hung work, before there
 * is anything to hang. `.gl-art` and `.lab-rule` are the real classes, so the
 * hairline, the aspect and the label's rule are the page's own rather than a
 * drawing of them.
 *
 * @param {{ aspect: string, lead?: boolean, lines?: number, className?: string }} props
 */
function GhostWork({ aspect, lead = false, lines = 2, className = '' }) {
  return (
    <div className={`gl-work${className ? ` ${className}` : ''}`}>
      <div className="gl-hung">
        {/* The fill is inline because `.gl-art` states its own background and
            is emitted after SKELETON_CSS — a bare `dg-skel` class here loses
            the shimmer's ground and the frame reads as already empty. */}
        <div
          className="gl-art dg-skel"
          style={vars({ '--ar': aspect, borderRadius: 0, background: SKEL_FILL })}
        />
      </div>
      <div className="lab lab-rule" style={{ marginTop: 16, maxWidth: 'none' }}>
        <Bar w={lead ? '72%' : '86%'} h={lead ? 20 : 13} style={{ marginBottom: 9 }} />
        <Bar w={lead ? '48%' : '54%'} h={10} style={{ marginBottom: lines > 2 ? 12 : 0 }} />
        {lines > 2 && (
          <>
            <Bar w="100%" h={9} style={{ marginBottom: 6 }} />
            <Bar w="88%" h={9} />
          </>
        )}
      </div>
    </div>
  );
}

/** The eyebrow and display line a wall opens with. */
function GhostWallHead({ wide = false }) {
  return (
    <div className="wall-h">
      <Bar w={wide ? 210 : 160} h={9} style={{ marginBottom: 14 }} />
      <Bar w={wide ? '46%' : '34%'} h={30} radius={4} />
    </div>
  );
}

export default function DGEditionSkeleton() {
  return (
    // The same entrance the day itself plays (dgFadeIn, from NAV_SHELL_CSS), so
    // the paper does not snap into place under the reader.
    <div
      className="gl"
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{ animation: 'dgFadeIn 0.4s ease-out' }}
    >
      <style>{SKELETON_CSS}</style>
      {/* The real stylesheet, not a copy of it: every frame below is measured
          by the same rules that will measure the real works a moment later. */}
      <style>{GALLERY_CSS}</style>

      <span style={{
        position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
        overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
      }}>
        Preparing today&rsquo;s edition
      </span>

      <div aria-hidden="true">
        {/* ── the entrance ── */}
        <section className="gl-entry">
          <div className="gl-entry-art dg-skel" style={{ borderRadius: 0, background: SKEL_FILL }} />
          <div className="gl-entry-in">
            <Bar w={230} h={9} style={{ marginBottom: 18 }} />
            <Bar w="52%" h={54} radius={4} style={{ marginBottom: 12 }} />
            <Bar w="38%" h={54} radius={4} style={{ marginBottom: 20 }} />
            <Bar w="30%" h={12} style={{ marginBottom: 7 }} />
            <Bar w="26%" h={12} />
            <div className="gl-turn">
              <GhostSeal />
              <div className="gl-turn-mid">
                <Bar w={180} h={14} style={{ marginBottom: 7 }} />
                <Bar w={92} h={8} />
              </div>
              <GhostSeal />
            </div>
          </div>
        </section>

        {/* ── the destination wall, and its four senses ── */}
        <section className="wall wall-first">
          <GhostWallHead />
          <div className="gl-hang gl-hang-dest">
            <GhostWork aspect="4 / 3" lead lines={4} />
            <GhostWork aspect="1 / 1" />
            <GhostWork aspect="1 / 1" />
            <GhostWork aspect="1 / 1" />
            <GhostWork aspect="1 / 1" />
          </div>
        </section>

        {/* ── the portrait wall ── */}
        <section className="wall">
          <GhostWallHead wide />
          <div className="gl-hang" style={vars({ '--cols': 4 })}>
            <GhostWork aspect="3 / 4" className="gl-work-1" lead lines={4} />
            <GhostWork aspect="3 / 4" />
            <GhostWork aspect="3 / 4" />
            <GhostWork aspect="3 / 4" />
            <GhostWork aspect="3 / 4" />
          </div>
        </section>

        {/* ── the salon hang ── */}
        <section className="wall">
          <GhostWallHead wide />
          <div className="gl-salon" style={vars({ '--cols': 4 })}>
            <GhostWork aspect="4 / 3" className="gl-frame gl-frame-1" lead lines={4} />
            <GhostWork aspect="4 / 3" lines={3} />
            <GhostWork aspect="4 / 3" lines={3} />
          </div>
        </section>

        {/* ── the year room ── */}
        <section className="wall">
          <GhostWallHead />
          <div className="gl-year-nav">
            <GhostSeal />
            <GhostSeal />
            <Bar w={150} h={9} />
          </div>
          <div className="gl-year-room">
            <div className="gl-year-grid">
              <div><GhostWork aspect="16 / 10" lead lines={4} /></div>
              <div><GhostWork aspect="4 / 3" lines={3} /></div>
            </div>
          </div>
        </section>

        {/* ── the ledger ── */}
        <section className="wall">
          <GhostWallHead wide />
          <div className="gl-ledger">
            <div><GhostWork aspect="4 / 3" lead lines={4} /></div>
            <div className="gl-list">
              {Array.from({ length: 8 }, (_, i) => (
                <div className="gl-row" key={i} style={{ cursor: 'default' }}>
                  <Bar w={16} h={8} />
                  <Bar w={34} h={11} />
                  <Bar w={`${88 - (i % 4) * 11}%`} h={12} />
                  <span />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
