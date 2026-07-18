'use server';
/**
 * Admin library actions for remarkable people (Phase 2). Server actions are
 * open endpoints, so every one starts with requireAdmin() and validates its
 * inputs. Public draft-gating lives in the readers (getPersonBySlug, the Born
 * Today query); these admin readers/writers are unfiltered.
 */
import { asc, eq, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/src/db';
import { remarkablePerson, storyBrief } from '@/src/db/schema';
import { requireAdmin } from '@/lib/dal';
import { slugify, SLUG_RE } from '@/lib/slug';

// Expected counts for a "complete" story (mirrors lib/golden-story counts).
const EXPECTED_CHAPTERS = 4;

export type PersonListItem = {
  slug: string;
  name: string;
  // 'MM-DD' or null — Born Today can't surface a person without a birth date.
  monthDay: string | null;
  missingBirthDate: boolean;
  published: boolean;
  coverUrl: string | null;
  chapterCount: number;
  timelineCount: number;
  treasureCount: number;
  // Image slots with no image_url (cover + childhood + modern + after +
  // per-chapter/timeline/treasure) and the total possible for this person.
  emptyImages: number;
  totalImages: number;
  hasBrief: boolean;
  incomplete: boolean;
};

/**
 * The whole library — one row per person with birth month-day, cover thumb,
 * published state and completeness signals computed in the query. Small table
 * (tens of rows), so search/filter happen client-side.
 */
export async function listPeople(): Promise<PersonListItem[]> {
  await requireAdmin();
  const empty = (col: unknown) => sql`(case when coalesce(${col}, '') = '' then 1 else 0 end)`;
  const emptyInArray = (col: unknown) =>
    sql`(select count(*) from jsonb_array_elements(${col}) e where coalesce(e ->> 'image_url', '') = '')`;

  const rows = await db
    .select({
      slug: remarkablePerson.slug,
      name: remarkablePerson.name,
      published: remarkablePerson.published,
      coverUrl: remarkablePerson.imageUrl,
      monthDay: sql<string | null>`to_char(${remarkablePerson.birthDate}, 'MM-DD')`,
      missingBirthDate: sql<boolean>`(${remarkablePerson.birthDate} is null)`,
      chapterCount: sql<number>`jsonb_array_length(${remarkablePerson.chapters})`,
      timelineCount: sql<number>`jsonb_array_length(${remarkablePerson.timeline})`,
      treasureCount: sql<number>`jsonb_array_length(${remarkablePerson.treasures})`,
      emptyImages: sql<number>`(
        ${empty(remarkablePerson.imageUrl)}
        + ${empty(remarkablePerson.childhoodImageUrl)}
        + ${sql`(case when coalesce(${remarkablePerson.modern} ->> 'image_url', '') = '' then 1 else 0 end)`}
        + ${sql`(case when coalesce(${remarkablePerson.afterTreasures} ->> 'image_url', '') = '' then 1 else 0 end)`}
        + ${emptyInArray(remarkablePerson.chapters)}
        + ${emptyInArray(remarkablePerson.timeline)}
        + ${emptyInArray(remarkablePerson.treasures)}
      )::int`,
      hasBrief: sql<boolean>`(${storyBrief.slug} is not null)`,
    })
    .from(remarkablePerson)
    .leftJoin(storyBrief, eq(storyBrief.slug, remarkablePerson.slug))
    .orderBy(asc(remarkablePerson.name));

  return rows.map((r) => {
    // Fixed image fields (cover, childhood, modern, after) + the three arrays.
    const totalImages = 4 + r.chapterCount + r.timelineCount + r.treasureCount;
    const incomplete = r.missingBirthDate || r.chapterCount < EXPECTED_CHAPTERS || r.emptyImages > 0;
    return { ...r, totalImages, incomplete };
  });
}

/**
 * Create a person from a name + (editable) slug, or overwrite an existing slug
 * after explicit confirmation. New rows are unpublished; on overwrite the row
 * is reset to a fresh draft (its R2 art is left in place — slugs may return —
 * and its brief is cleared). On success the editor is opened.
 */
export async function createPerson(input: { name?: string; slug?: string; overwrite?: boolean }):
  Promise<{ ok: false; error?: string; collision?: string }> {
  await requireAdmin();
  const name = typeof input?.name === 'string' ? input.name.trim().slice(0, 120) : '';
  if (name.length < 1) return { ok: false, error: 'Please enter a name.' };

  const raw = typeof input?.slug === 'string' && input.slug.trim() ? input.slug : name;
  const slug = slugify(raw);
  if (!SLUG_RE.test(slug)) {
    return { ok: false, error: 'The slug must be lowercase letters, numbers and dashes.' };
  }

  const existing = await db
    .select({ name: remarkablePerson.name })
    .from(remarkablePerson)
    .where(eq(remarkablePerson.slug, slug))
    .limit(1);

  if (existing[0] && !input.overwrite) {
    // Ask the caller to confirm before clobbering an existing person.
    return { ok: false, collision: existing[0].name };
  }

  if (existing[0]) {
    await db.transaction(async (tx) => {
      await tx.delete(storyBrief).where(eq(storyBrief.slug, slug));
      await tx
        .update(remarkablePerson)
        .set({
          name,
          published: false,
          role: null, field: null, country: null, birthDate: null, deathDate: null,
          storyTitle: null, famousQuote: null, imageUrl: null,
          storyChildhoodTitle: null, childhoodImageUrl: null,
          storyChildhood: null, storyTakeaway: null,
          modern: null, chapters: [], timeline: [], afterTreasures: null,
          treasures: [], lessons: [],
          updatedAt: new Date(),
        })
        .where(eq(remarkablePerson.slug, slug));
    });
  } else {
    await db.insert(remarkablePerson).values({ slug, name, published: false });
  }

  redirect(`/admin/people/${slug}`);
}

/**
 * Delete a person after a typed-slug confirmation. story_brief and
 * generation_job rows cascade; R2 objects are intentionally left in place
 * (cheap, and a slug may be recreated later).
 */
export async function deletePerson(slug: string, confirmSlug: string):
  Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (typeof slug !== 'string' || !slug) return { ok: false, error: 'Missing slug.' };
  if (confirmSlug !== slug) return { ok: false, error: 'The typed slug does not match.' };

  await db.delete(remarkablePerson).where(eq(remarkablePerson.slug, slug));
  revalidatePath('/admin/people');
  return { ok: true };
}
