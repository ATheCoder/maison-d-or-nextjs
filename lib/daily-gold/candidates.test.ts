/**
 * The candidate arithmetic (D11).
 *
 * Worth testing because it is pure, and because getting it wrong is invisible:
 * an off-by-one in `firstFreeSlot` does not throw, it silently publishes a
 * proposal into a rung the reader never renders, or over one the admin wrote.
 * The unique indexes catch a collision; nothing catches a *wrong but legal*
 * slot except this.
 */
import { describe, expect, it } from 'vitest';
import {
  MOMENT_PARK_FROM, MOMENT_RANKS, NEWS_DISPLAY_SLOTS, NEWS_PARK_FROM,
  firstFreeSlot, isCandidate, nextParkingSlot,
} from './candidates';

describe('firstFreeSlot', () => {
  it('takes the lowest free place, not the next one along', () => {
    // A column holding 0, 1 and 3: the gap at 2 is the right answer, because
    // accepting is a move into the column rather than an append to it.
    expect(firstFreeSlot([0, 1, 3], 0, NEWS_DISPLAY_SLOTS)).toBe(2);
  });

  it('starts at the band floor when nothing is taken', () => {
    expect(firstFreeSlot([], 0, NEWS_DISPLAY_SLOTS)).toBe(0);
    expect(firstFreeSlot([], 1, MOMENT_RANKS)).toBe(1);
  });

  it('returns null when the band is full, rather than spilling past it', () => {
    const full = Array.from({ length: 10 }, (_, i) => i);
    expect(firstFreeSlot(full, 0, NEWS_DISPLAY_SLOTS)).toBeNull();
  });

  it('ignores parked candidates above the band', () => {
    // Positions 10+ are the parking band; they must not make the column look
    // full, or a date with eight proposals could never be written into by hand.
    expect(firstFreeSlot([0, 1, 10, 11, 12], 0, NEWS_DISPLAY_SLOTS)).toBe(2);
  });

  it('counts a hand-written draft as occupying its slot', () => {
    // An unpublished row the admin typed owns position 3 as surely as a
    // published one: moving it aside for a proposal would be the AI
    // overwriting their work.
    expect(firstFreeSlot([0, 3], 0, NEWS_DISPLAY_SLOTS)).toBe(1);
  });

  it('is 1-based for the moment ladder', () => {
    // Rank 0 does not exist — a moment accepted into it would sort ahead of
    // rank 1 and render as an eleventh rung.
    expect(firstFreeSlot([1, 2], 1, MOMENT_RANKS)).toBe(3);
    expect(firstFreeSlot(Array.from({ length: 10 }, (_, i) => i + 1), 1, MOMENT_RANKS)).toBeNull();
  });
});

describe('nextParkingSlot', () => {
  it('parks the first candidate at the foot of the parking band', () => {
    expect(nextParkingSlot([0, 1, 2], NEWS_PARK_FROM)).toBe(10);
    expect(nextParkingSlot([1, 2, 3], MOMENT_PARK_FROM)).toBe(11);
  });

  it('stacks candidates without reusing a taken value', () => {
    expect(nextParkingSlot([10, 11], NEWS_PARK_FROM)).toBe(12);
  });

  it('never reaches down into the display band', () => {
    // Even with the whole column empty, a proposal parks above it: retrieval
    // proposes, it does not publish.
    expect(nextParkingSlot([], NEWS_PARK_FROM)).toBe(NEWS_DISPLAY_SLOTS);
    expect(nextParkingSlot([], MOMENT_PARK_FROM)).toBeGreaterThan(MOMENT_RANKS);
  });
});

describe('isCandidate', () => {
  it('is true only for a retrieved row nobody has reviewed', () => {
    expect(isCandidate({ retrieved_at: '2026-07-26T00:00:00Z', reviewed_at: null })).toBe(true);
  });

  it('is false for a hand-written draft', () => {
    // Unpublished is not the test — plenty of rows are unpublished because
    // nobody has finished writing them.
    expect(isCandidate({ retrieved_at: null, reviewed_at: null })).toBe(false);
  });

  it('is false once accepted, and stays false when the day is withdrawn', () => {
    // The review stamp is what survives a day being published, unpublished and
    // published again; the `published` flag is not.
    expect(isCandidate({ retrieved_at: '2026-07-26T00:00:00Z', reviewed_at: '2026-07-26T09:00:00Z' })).toBe(false);
  });
});
