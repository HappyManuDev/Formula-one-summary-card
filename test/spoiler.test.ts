import { describe, expect, it } from 'vitest';

import { spoilerWindow } from '../src/f1/spoiler';
import { LAST_RACE_START, makeData, NEXT_RACE, NEXT_RACE_START } from './helpers';

const HOUR = 3_600_000;
const at = (date: Date, hours: number) => new Date(date.getTime() + hours * HOUR);

describe('spoilerWindow', () => {
  it('covers the race and the delay after its estimated end', () => {
    const window = spoilerWindow(makeData(), at(LAST_RACE_START, 3), 6);
    expect(window?.key).toBe(LAST_RACE_START.toISOString());
    expect(window?.until).toEqual(at(LAST_RACE_START, 8));
  });

  it('ends once the delay is over', () => {
    expect(spoilerWindow(makeData(), at(LAST_RACE_START, 7.9), 6)).toBeDefined();
    expect(spoilerWindow(makeData(), at(LAST_RACE_START, 8), 6)).toBeUndefined();
  });

  it('does not apply before the race starts', () => {
    expect(spoilerWindow(makeData(), at(NEXT_RACE_START, -1), 6)).toBeUndefined();
  });

  it('starts with the race, before the results sensor updates', () => {
    const window = spoilerWindow(makeData(), at(NEXT_RACE_START, 1), 6);
    expect(window?.key).toBe(NEXT_RACE_START.toISOString());
  });

  it('protects the last race of the season, when there is no next race', () => {
    expect(spoilerWindow(makeData({ next: {} }), at(LAST_RACE_START, 1), 6)).toBeDefined();
  });

  it('keeps the same key once the results sensor points to the race', () => {
    const race = NEXT_RACE();
    const during = spoilerWindow(makeData(), at(NEXT_RACE_START, 1), 6);
    const after = spoilerWindow(makeData({ last: race, next: {} }), at(NEXT_RACE_START, 3), 6);
    expect(after?.key).toBe(during?.key);
  });
});
