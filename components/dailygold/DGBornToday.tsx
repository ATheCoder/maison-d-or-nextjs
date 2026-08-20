'use client';
/**
 * DGBornToday — the portrait wall: the people born on this date, hung.
 *
 * This was a shelf of leather-bound volumes: each portrait was a book cover
 * with the name foil-stamped across it, standing on a podium that leaned
 * toward the pointer, under a conic cone of light. Four stacked gradient
 * washes existed to keep that foil legible over the face beneath it, and the
 * face was what they covered.
 *
 * The gallery takes the text off the picture. A portrait hangs flat at 3:4
 * with a hairline frame, and the name, the role, the dates and the door all
 * live in a label *beneath* it — which deletes the four washes, the two text
 * shadows and the whole legibility problem in one move, and is the first time
 * these paintings have actually been visible. Rank is the size of the work:
 * the first is hung double and given the wall's corner, the rest hang in order
 * of standing beside and beneath it.
 *
 * The book language is not gone from the product — it moved to where it is
 * true. /stories/[slug] still opens as a book, and StoryOpeningCurtain still
 * plays over the frame during the navigation, so pressing a portrait here
 * still feels like opening one.
 */
import Link from 'next/link';
import { useInstrumentation } from '@/components/dailygold/instrumentation/DGInstrumentationProvider';
import StoryOpeningCurtain from '@/components/dailygold/StoryOpeningCurtain';
import FlagSealMedallion from '@/components/dailygold/FlagSealMedallion';
import Wall from '@/components/dailygold/gallery/Wall';
import Work from '@/components/dailygold/gallery/Work';
import Label, { LabelNoAction } from '@/components/dailygold/gallery/Label';
import { hangColumns, hasLead } from '@/components/dailygold/gallery/columns';
import { resolvePerson } from '@/lib/countries';
import TreasuryHeart from '@/components/treasury/TreasuryHeart';
import { formatDate, formatYear } from '@/lib/dates';
import type { PersonRecord } from '@/app/(dg)/daily-gold-edition/queries';

// ── ONE WORK ON THE WALL ─────────────────────────────────────────────────────
function Portrait({
  person,
  savedSet,
  editionDate,
  lead = false,
}: {
  person: PersonRecord;
  savedSet?: Set<string> | null;
  editionDate?: string;
  /** Rank one: hung double-size in the wall's corner, and the only one with a paragraph. */
  lead?: boolean;
}) {
  const { track } = useInstrumentation();
  // personToRecord emits snake_case; resolvePerson prefers an explicit code and
  // falls back to the nationality text (R4.1). It is passed no `nationality`
  // here because a PersonRecord has none — remarkable_person keeps the
  // nationality adjective in `country` (see PersonEditor's note on that column).
  const iso2 = resolvePerson({
    countryCode: person.country_code,
    country: person.country,
  });
  const initials = person.name ? person.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
  // Portraits come from remarkable_person (R2-hosted covers); a person without
  // one hangs in an empty frame rather than behind a placeholder.
  const imgUrl = person.image_url || null;
  // Some rows carry the person's own name as their story_title; printing it
  // under the name reads as a mistake, so fall through to the real role.
  const role = [person.story_title, person.role, person.field]
    .find(t => t && t.trim().toLowerCase() !== (person.name || '').trim().toLowerCase()) || null;
  const dates = `${formatDate(person.birth_date)}${person.death_date ? ` to ${formatYear(person.death_date)}` : ''}`;
  const meta = [dates, person.country].filter(Boolean).join(' · ');

  // Leaving the wall, not opening the book: the story route mounts its own
  // provider and reports the read itself. What this records is the choice —
  // which work the child reached for, from where.
  const recordChoice = () => track('nav_select', {
    contentType: 'person',
    contentId: `/stories/${person.slug}`,
    label: person.name,
    source: 'section',
    section: 'born_today',
  });

  return (
    // A work with no story behind it hangs quieter than the rest — the wall's
    // own way of saying "not yet", without a badge.
    <div className={`gl-work${lead ? ' gl-work-1' : ''}${person.slug ? '' : ' gl-work-quiet'}`}>
      <Work
        aspect="3 / 4"
        imageUrl={imgUrl}
        alt={person.name}
        href={person.slug ? `/stories/${person.slug}` : undefined}
        onClick={person.slug ? recordChoice : undefined}
        ariaLabel={person.slug ? `Open the story of ${person.name}` : undefined}
        prefetch={false}
        seal={iso2 ? (
          <FlagSealMedallion
            countryCode={iso2}
            countryName={person.country || ''}
            size={lead ? 'sm' : 'xs'}
            earned
            fallbackInitials={initials}
          />
        ) : undefined}
        /* A slugless work gets no heart: with no story to open there is no
           stable id to save it under and nowhere for the treasury card to
           lead. No reader (savedSet null) means no hearts at all. */
        heart={savedSet && person.slug ? (
          <TreasuryHeart
            itemType="person"
            itemId={person.slug}
            itemTitle={person.name}
            itemSubtitle={role}
            itemImageUrl={imgUrl}
            countryCode={iso2}
            countryName={person.country}
            editionDate={editionDate}
            initialSaved={savedSet.has(`person:${person.slug}`)}
            onImage
          />
        ) : undefined}
      >
        {person.slug && <StoryOpeningCurtain name={person.name} imgUrl={imgUrl} />}
      </Work>

      <Label
        size={lead ? 'lead' : 'work'}
        title={person.name}
        subtitle={role}
        meta={meta || undefined}
        body={lead ? person.story_takeaway || undefined : undefined}
        action={person.slug
          ? (
            <Link href={`/stories/${person.slug}`} className="go" prefetch={false} onClick={recordChoice}>
              Open the story ›
            </Link>
          )
          : <LabelNoAction>Story not written yet</LabelNoAction>}
      />
    </div>
  );
}

// ── THE WALL ─────────────────────────────────────────────────────────────────
export default function DGBornToday({
  people = [],
  savedSet = null,
  editionDate,
}: {
  people?: PersonRecord[];
  /** The reader's saved treasury keys, or null when there is no reader. */
  savedSet?: Set<string> | null;
  editionDate?: string;
}) {
  if (!people.length) return null;

  const works = people.slice(0, 10);
  // The lead spans 2×2, so the wall takes the widest column count whose two
  // rows beside it the rest can actually fill — see gallery/columns.ts. Days
  // here carry one to seven people, never the mockup's ten.
  const cols = hangColumns(works.length, 5);
  const lead = hasLead(works.length);

  return (
    <Wall
      eyebrow="Extraordinary lives"
      title="Born on This Day"
      lede={lead
        ? `${works.length} works hung this morning. The first is hung larger and given the wall's corner; the rest hang in order of standing.`
        : works.length > 1
          ? `${works.length} works hung this morning, in order of standing.`
          : 'One work, hung alone this morning.'}
    >
      <div className="gl-hang" style={{ ['--cols' as string]: cols }}>
        {works.map((person, i) => (
          <Portrait
            key={person.slug || i}
            person={person}
            savedSet={savedSet}
            editionDate={editionDate}
            lead={lead && i === 0}
          />
        ))}
      </div>
    </Wall>
  );
}
