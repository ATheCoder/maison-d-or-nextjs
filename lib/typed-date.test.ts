import { describe, it, expect } from 'vitest';
import {
  formatTypedDate,
  maskTypedDate,
  parseTypedDate,
  typedDateMonth,
  typedDateProblem,
} from './typed-date';

describe('parseTypedDate', () => {
  it('reads the written form, with or without leading zeros', () => {
    expect(parseTypedDate('04/03/2016')).toBe('2016-03-04');
    expect(parseTypedDate('4/3/2016')).toBe('2016-03-04');
  });

  it('accepts the separators people actually use', () => {
    expect(parseTypedDate('4.3.2016')).toBe('2016-03-04');
    expect(parseTypedDate('4-3-2016')).toBe('2016-03-04');
    expect(parseTypedDate('4 3 2016')).toBe('2016-03-04');
  });

  it('accepts eight bare digits and an ISO paste', () => {
    expect(parseTypedDate('04032016')).toBe('2016-03-04');
    expect(parseTypedDate('2016-03-04')).toBe('2016-03-04');
    expect(parseTypedDate('2016-3-4')).toBe('2016-03-04');
  });

  it('ignores surrounding whitespace', () => {
    expect(parseTypedDate('  04/03/2016 ')).toBe('2016-03-04');
  });

  it('rejects days that do not exist', () => {
    expect(parseTypedDate('31/02/2016')).toBeNull();
    expect(parseTypedDate('29/02/2015')).toBeNull();
    expect(parseTypedDate('29/02/2016')).toBe('2016-02-29');
  });

  it('refuses to guess at a two-digit year', () => {
    expect(parseTypedDate('4/3/16')).toBeNull();
  });

  it('rejects the incomplete and the nonsensical', () => {
    expect(parseTypedDate('')).toBeNull();
    expect(parseTypedDate('04/03')).toBeNull();
    expect(parseTypedDate('0403201')).toBeNull();
    expect(parseTypedDate('yesterday')).toBeNull();
  });
});

describe('formatTypedDate', () => {
  it('pads to the written form', () => {
    expect(formatTypedDate('2016-03-04')).toBe('04/03/2016');
  });

  it('round-trips with the parser', () => {
    expect(parseTypedDate(formatTypedDate('1452-04-15'))).toBe('1452-04-15');
  });

  it('is empty for anything that is not a day', () => {
    expect(formatTypedDate('')).toBe('');
    expect(formatTypedDate('2015-02-29')).toBe('');
    expect(formatTypedDate(null)).toBe('');
  });
});

describe('typedDateMonth', () => {
  it('is the date itself when the date is real', () => {
    expect(typedDateMonth('04/03/2016')).toBe('2016-03-04');
  });

  it('keeps the month of an impossible day', () => {
    expect(typedDateMonth('31/02/2016')).toBe('2016-02-01');
  });

  it('has nothing to offer for text with no month in it', () => {
    expect(typedDateMonth('04/2016')).toBeNull();
    expect(typedDateMonth('')).toBeNull();
  });
});

describe('typedDateProblem', () => {
  it('says nothing about an empty or a valid field', () => {
    expect(typedDateProblem('')).toBeNull();
    expect(typedDateProblem('   ')).toBeNull();
    expect(typedDateProblem('04/03/2016')).toBeNull();
  });

  it('distinguishes a well-formed impossible day from unreadable text', () => {
    expect(typedDateProblem('31/02/2016')).toBe('That day does not exist.');
    expect(typedDateProblem('2015-02-29')).toBe('That day does not exist.');
    expect(typedDateProblem('04/03')).toMatch(/DD \/ MM \/ YYYY/);
  });
});

describe('maskTypedDate', () => {
  it('inserts the separators as the field grows', () => {
    expect(maskTypedDate('', '0')).toBe('0');
    expect(maskTypedDate('0', '04')).toBe('04');
    expect(maskTypedDate('04', '040')).toBe('04/0');
    expect(maskTypedDate('04/0', '04/03')).toBe('04/03');
    expect(maskTypedDate('04/03', '04/032')).toBe('04/03/2');
    expect(maskTypedDate('04/03/201', '04/03/2016')).toBe('04/03/2016');
  });

  it('stops at eight digits', () => {
    expect(maskTypedDate('04/03/2016', '04/03/20166')).toBe('04/03/2016');
  });

  it('leaves a deletion alone, so a backspace is never undone', () => {
    expect(maskTypedDate('04/03/2016', '04/03/201')).toBe('04/03/201');
    expect(maskTypedDate('04/', '04')).toBe('04');
  });

  it('leaves anything that is not digits and slashes exactly as typed', () => {
    expect(maskTypedDate('', '2016-03-04')).toBe('2016-03-04');
    expect(maskTypedDate('4', '4.3.2016')).toBe('4.3.2016');
  });
});
