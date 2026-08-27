import { SkeletonBar, SkeletonStatus } from '@/components/maison/ParchmentSkeleton';

/**
 * Suspense fallback for /family — FamilyManager's ledger, drawn empty.
 *
 * The manager is a client component, so its markup cannot be imported here;
 * what this file owes it is agreeing NUMBERS. Those numbers now come from the
 * primitives rather than from a copied style object, and the comments below
 * name which one each measurement is read off:
 *   Container width="prose"  → max-w-3xl (768px) with a px-6 gutter
 *   Card padding="md"        → p-5, --radius-md, a --border-fine hairline
 *   Heading variant="story"  → --type-display-story at lh 1.25 ≈ 30px
 *   Field size md            → --type-body-ui at lh 1.5 + py-2.5 ≈ 45px
 *   Avatar size="md"         → size-10 (40px)
 *   Button size md           → the same box without the border ≈ 43px
 *
 * It is drawn in the SAME semantic tokens the page is (2026-08-27), which is
 * the part that used to be wrong: this file hard-coded `#F5F0E7` because the
 * page hard-coded its own ivory ground, and both ignored the theme. The page
 * has no ground of its own any more — the (dg) shell's --surface-page is the
 * ground — so this one paints none either, and every hairline, ink and gold
 * below re-scopes with the rail's theme picker exactly as the real ledger does.
 *
 * Rows the data decides — a second child, a pending invite, the unverified-
 * email note — have no ghosts; one child row and two guardian rows model the
 * common family.
 */
const card: React.CSSProperties = {
  background: 'var(--surface-raised)',
  border: '1px solid var(--border-fine)',
  borderRadius: 'var(--radius-md)',
  padding: '1.25rem',
  marginBottom: '1.25rem',
};

/** The hairline a ListRow draws under itself: border-b border-fine, py-2.5. */
const row: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.625rem 0',
  borderBottom: '1px solid var(--border-fine)',
};

/** A section title: Heading variant="story" (≈30px tall) with its mb-4. */
function TitleBar({ w }: { w: number }) {
  return <SkeletonBar w={w} h={30} style={{ marginBottom: '1rem' }} />;
}

/** A gold-filled Button ghost — the coat is --accent, so it must be too. */
const goldBar: React.CSSProperties = {
  background: 'color-mix(in srgb, var(--accent) 40%, transparent)',
};

export default function Loading() {
  return (
    <SkeletonStatus
      label="Opening your family's ledger"
      style={{
        padding: '1.5rem 1.5rem 6rem',
        fontFamily: 'var(--face-sans)',
        animation: 'mdoSkelFade 0.3s ease-out',
      }}
    >
      <div style={{ maxWidth: '48rem', margin: '0 auto' }}>
        {/* Masthead: eyebrow + family name on the left, Profiles + Sign out
            on the right. The eyebrow is the same static line the page
            renders — not pending data, so it is set rather than ghosted. */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <p className="type-label-editorial text-accent-readable" style={{ margin: 0 }}>
              Maison d&apos;Oré — Your family
            </p>
            {/* Heading level={1} variant="section": --type-display-section
                at lh 1.15, ≈46px at the desktop end of its clamp. */}
            <SkeletonBar w={200} h={46} style={{ marginTop: '0.5rem' }} />
          </div>
          <span style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <SkeletonBar w={50} h={13} />
            {/* Sign out is a ghost Button at size="sm": caption type in a
                px-3.5/py-2 box over a hairline, ≈36px. */}
            <SkeletonBar
              w={86} h={36} radius="var(--radius-md)"
              style={{ background: 'transparent', border: '1px solid var(--border-accent)' }}
            />
          </span>
        </div>

        {/* Family name: a labelHidden Field beside its Save button */}
        <section style={card}>
          <TitleBar w={120} />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem' }}>
            <SkeletonBar w="auto" h={45} radius="var(--radius-md)" style={{ flex: 1 }} />
            <SkeletonBar w={80} h={43} radius="var(--radius-md)" style={goldBar} />
          </div>
        </section>

        {/* Timezone: the select, then its hint in the message seat below —
            the explanation moved INTO the field when this became a Field. */}
        <section style={card}>
          <TitleBar w={110} />
          <SkeletonBar w="min(21.25rem, 100%)" h={45} radius="var(--radius-md)" />
          <SkeletonBar w="100%" h={13} style={{ marginTop: '0.375rem' }} />
          <SkeletonBar w="70%" h={13} style={{ marginTop: '0.25rem' }} />
        </section>

        {/* Children: one child row (emblem, name, the meta line, the verbs),
            then the add-child row and the emblem picker under it */}
        <section style={card}>
          <TitleBar w={110} />
          <div style={row}>
            <SkeletonBar w={40} h={40} radius="50%" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <SkeletonBar w={180} h={15} />
            </div>
            <SkeletonBar w={170} h={30} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            {/* Both of these carry a visible label (12px) above the control. */}
            <div style={{ flex: '1 1 9rem' }}>
              <SkeletonBar w={90} h={12} />
              <SkeletonBar w="auto" h={45} radius="var(--radius-md)" style={{ marginTop: '0.5rem' }} />
            </div>
            <div>
              <SkeletonBar w={104} h={12} />
              <SkeletonBar w={186} h={45} radius="var(--radius-md)" style={{ marginTop: '0.5rem' }} />
              <SkeletonBar w={186} h={13} style={{ marginTop: '0.375rem' }} />
            </div>
            <SkeletonBar w={72} h={43} radius="var(--radius-md)" style={goldBar} />
          </div>
          <SkeletonBar w={104} h={12} style={{ marginTop: '0.5rem' }} />
          <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.375rem' }}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <SkeletonBar key={i} w={40} h={40} radius="50%" />
            ))}
          </div>
        </section>

        {/* Your parent PIN: the explanation, then PIN + password + Save */}
        <section style={card}>
          <TitleBar w={170} />
          <SkeletonBar w="90%" h={13} />
          <SkeletonBar w="55%" h={13} style={{ marginTop: '0.25rem', marginBottom: '0.875rem' }} />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem' }}>
            <SkeletonBar w={112} h={45} radius="var(--radius-md)" />
            <SkeletonBar w="auto" h={45} radius="var(--radius-md)" style={{ flex: 1 }} />
            <SkeletonBar w={80} h={43} radius="var(--radius-md)" style={goldBar} />
          </div>
        </section>

        {/* Parents & guardians: two member rows */}
        <section style={card}>
          <TitleBar w={180} />
          {[0, 1].map((i) => (
            <div key={i} style={{ ...row, justifyContent: 'space-between' }}>
              <SkeletonBar w={120} h={15} />
              <SkeletonBar w={160} h={13} />
            </div>
          ))}
        </section>

        {/* Invite a co-guardian: email + Invite */}
        <section style={card}>
          <TitleBar w={190} />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem' }}>
            <SkeletonBar w="auto" h={45} radius="var(--radius-md)" style={{ flex: 1 }} />
            <SkeletonBar w={84} h={43} radius="var(--radius-md)" style={goldBar} />
          </div>
        </section>
      </div>
    </SkeletonStatus>
  );
}
