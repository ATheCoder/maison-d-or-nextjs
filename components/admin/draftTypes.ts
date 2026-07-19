/**
 * The client-only `_key` identity threaded through chapters/timeline/treasures/
 * lessons so dnd-kit can track a row across reorders instead of by its slot
 * index (positional ids fight the reorder animation — see SortableRow /
 * SortableChapterRow). Never sent to the server: `withKeys` assigns them once
 * when a person is loaded into the draft, `stripKeys` removes them before save.
 */
import type { EditorPerson } from '@/app/admin/people/actions';
import type { Chapter, TimelineEntry, Treasure, Lesson } from '@/src/db/schema';

export type Keyed<T> = T & { _key: string };

export type DraftPerson = Omit<EditorPerson, 'chapters' | 'timeline' | 'treasures' | 'lessons'> & {
  chapters: Keyed<Chapter>[];
  timeline: Keyed<TimelineEntry>[];
  treasures: Keyed<Treasure>[];
  lessons: Keyed<Lesson>[];
};

function keyed<T>(item: T): Keyed<T> {
  return { ...item, _key: crypto.randomUUID() };
}

export function withKeys(person: EditorPerson): DraftPerson {
  return {
    ...person,
    chapters: person.chapters.map(keyed),
    timeline: person.timeline.map(keyed),
    treasures: person.treasures.map(keyed),
    lessons: person.lessons.map(keyed),
  };
}

function unkeyed<T extends { _key: string }>(item: T): Omit<T, '_key'> {
  const rest: Partial<T> = { ...item };
  delete rest._key;
  return rest as Omit<T, '_key'>;
}

export function stripKeys(draft: DraftPerson): EditorPerson {
  return {
    ...draft,
    chapters: draft.chapters.map(unkeyed),
    timeline: draft.timeline.map(unkeyed),
    treasures: draft.treasures.map(unkeyed),
    lessons: draft.lessons.map(unkeyed),
  };
}
