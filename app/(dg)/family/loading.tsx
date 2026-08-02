import { SkeletonBar, SkeletonStatus } from '@/components/maison/ParchmentSkeleton';

/**
 * Suspense fallback for /family — FamilyManager's ledger, drawn empty.
 *
 * Style literals are copied from FamilyManager rather than imported: the
 * manager is a client component and its `card`/`h2`/`input` consts are its
 * own business. What matters is that the numbers agree — the same
 * 3rem/clamp() page padding, the same 640px centred column, the same
 * space-between masthead with Profiles + Sign out on the right, and the same
 * five parchment cards in the page's own order — so the real ledger lands on
 * its own outline.
 *
 * The page hard-codes the ivory palette and ignores the theme (it is a
 * grown-ups' room), so this does too — which is also why it can stay a
 * server component on ParchmentSkeleton instead of importing the theme.
 *
 * Rows the data decides — a second child, a pending invite, the unverified
 * -email note — have no ghosts; one child row and two guardian rows model
 * the common family.
 */
const card: React.CSSProperties = {
  background: 'rgba(255,248,238,0.8)',
  border: '1px solid rgba(201,169,110,0.25)',
  borderRadius: 14,
  padding: '1.5rem',
  marginBottom: '1.25rem',
};

/** h2: 1.1rem Playfair at lh 1.2 ≈ 21px, with the card's 1rem drop. */
function TitleBar({ w }: { w: number }) {
  return <SkeletonBar w={w} h={21} style={{ marginBottom: '1rem' }} />;
}

export default function Loading() {
  return (
    <SkeletonStatus
      label="Opening your family's ledger"
      style={{
        minHeight: '100vh',
        background: '#F5F0E7',
        padding: '3rem clamp(1.5rem, 5vw, 4rem)',
        fontFamily: 'Lato, sans-serif',
        animation: 'mdoSkelFade 0.3s ease-out',
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Masthead: eyebrow + family name on the left, Profiles + Sign out
            on the right. The eyebrow is the same static line the page
            renders — not pending data. */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
          <div>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#C9A96E', margin: '0 0 0.4rem' }}>
              Maison d&apos;Oré — Your family
            </p>
            {/* The family name: 1.9rem Playfair at lh 1.2 */}
            <SkeletonBar w={200} h={37} />
          </div>
          <span style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <SkeletonBar w={50} h={12} />
            <SkeletonBar w={97} h={39} radius={10} style={{ background: 'transparent', border: '1px solid rgba(201,169,110,0.5)' }} />
          </span>
        </div>

        {/* Family name: input (0.6rem×2 + 0.85rem at lh 1.75 ≈ 45px) + Save */}
        <section style={card}>
          <TitleBar w={120} />
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <SkeletonBar w="auto" h={45} radius={10} style={{ flex: 1 }} />
            <SkeletonBar w={80} h={40} radius={10} style={{ background: 'rgba(201,169,110,0.4)' }} />
          </div>
        </section>

        {/* Timezone: two explanation lines, then the select */}
        <section style={card}>
          <TitleBar w={110} />
          <SkeletonBar w="100%" h={13} />
          <SkeletonBar w="70%" h={13} style={{ margin: '0.4rem 0 0.9rem' }} />
          <SkeletonBar w="min(340px, 100%)" h={45} radius={10} />
        </section>

        {/* Children: one child row (avatar, name, birthday, the action links)
            and the add-child row beneath it */}
        <section style={card}>
          <TitleBar w={110} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.55rem 0', borderBottom: '1px solid rgba(201,169,110,0.15)' }}>
            <SkeletonBar w={38} h={38} radius="50%" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <SkeletonBar w={160} h={14} />
            </div>
            <SkeletonBar w={150} h={12} />
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <SkeletonBar w="auto" h={45} radius={10} style={{ flex: '1 1 9rem' }} />
            <SkeletonBar w={186} h={45} radius={10} />
          </div>
        </section>

        {/* Parents & guardians: two member rows */}
        <section style={card}>
          <TitleBar w={180} />
          {[0, 1].map((i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(201,169,110,0.15)' }}>
              <SkeletonBar w={120} h={14} />
              <SkeletonBar w={160} h={12} />
            </div>
          ))}
        </section>

        {/* Invite a co-guardian: email + send */}
        <section style={card}>
          <TitleBar w={190} />
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <SkeletonBar w="auto" h={45} radius={10} style={{ flex: 1 }} />
            <SkeletonBar w={90} h={40} radius={10} style={{ background: 'rgba(201,169,110,0.4)' }} />
          </div>
        </section>
      </div>
    </SkeletonStatus>
  );
}
