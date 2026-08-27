import Link from 'next/link';
import { Container, Eyebrow, Heading, Prose, Rule, SectionSurface } from '@/components/ds';
import MMonogram from './MMonogram';
import MaisonBrandName from './MaisonBrandName';
import CopyrightYear from './CopyrightYear';

/**
 * The landing page's footer, redrawn onto components/ds with the page above
 * it. Same three columns, same links, same two closing lines — read from the
 * §1/§2 tokens now instead of from the legacy palette, so the whole page ends
 * in the same language it starts in.
 *
 * It stands on `surface="tint"`'s ground rather than the legacy --ivory: the
 * page's last band is sand, one step down from parchment, which closes the
 * document instead of brightening at the very bottom the way the old
 * ivory footer did.
 */

// Routes that exist. The legacy footer also listed Journal, The Living
// Almanac, Recipes, Academy, Wellness and Golden Escapes — all 404s here, the
// same cut features the landing page stopped advertising. Add a row back when
// its route ships. The last three sit behind the proxy's auth check, so a
// signed-out visitor lands on /login?next=… rather than a dead end.
const NAV_LINKS: [string, string][] = [
  ['/', 'Home'],
  ['/daily-gold-edition', "Today's Edition"],
  ['/family', 'Family'],
  ['/treasury', 'The Treasury'],
  ['/passport', 'Passport'],
];

/* Not links, and deliberately still not links: the legacy footer rendered
   these four as <p>s with `cursor: pointer` and no href, which is a control
   that goes nowhere wearing the costume of one that does. They are a list of
   where the Maison is, until there are accounts to point at. */
const SOCIAL = ['Instagram', 'Pinterest', 'TikTok', 'Facebook'];

const FOOTER_LINK =
  'type-body-ui text-secondary transition-colors duration-300 hover:text-accent-readable ' +
  'focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

export default function MaisonFooter() {
  return (
    <SectionSurface as="footer" surface="light" padding="none">
      <div className="border-t border-accent bg-surface-tint pt-16 pb-8">
        <Container width="wide">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
            {/* Left */}
            <div>
              <MMonogram size={48} />
              <Heading level={2} variant="story" className="mt-5">
                <MaisonBrandName />
              </Heading>
              <Prose variant="body-ui" className="mt-3">
                Built for people who still want to feel something.
              </Prose>
            </div>

            {/* Centre */}
            <nav aria-label="Footer">
              <Eyebrow rule={false} tone="secondary">
                Navigation
              </Eyebrow>
              <ul className="mt-4 space-y-2">
                {NAV_LINKS.map(([path, label]) => (
                  <li key={path}>
                    <Link href={path} className={FOOTER_LINK}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Right */}
            <div>
              <Eyebrow rule={false} tone="secondary">
                Connect
              </Eyebrow>
              <ul className="mt-4 space-y-2">
                {SOCIAL.map((name) => (
                  <li key={name} className="type-body-ui text-secondary">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Rule className="mt-14" />

          <div className="mt-8 text-center">
            <p className="type-quote text-secondary">
              For people who want to feel more alive inside their own lives.
            </p>
            <Prose variant="caption" measure={false} className="mt-4">
              © <CopyrightYear /> <MaisonBrandName />. All rights reserved.
            </Prose>
          </div>
        </Container>
      </div>
    </SectionSurface>
  );
}
