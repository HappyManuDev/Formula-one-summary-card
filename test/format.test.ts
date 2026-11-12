import { describe, expect, it } from 'vitest';

import { localizePlural } from '../src/localize/localize';
import { formatCountdown, formatDate, formatDateRange } from '../src/utils/format';
import { makeHass } from './helpers';

const now = new Date('2026-11-12T10:00:00Z');
const later = (minutes: number) => new Date(now.getTime() + minutes * 60_000);

describe('formatCountdown', () => {
  const fr = makeHass({}, 'fr');
  const en = makeHass({}, 'en');

  it('shows days and hours', () => {
    expect(formatCountdown(later(3 * 1440 + 4 * 60 + 10), now, fr)).toBe('3 j 4 h');
    expect(formatCountdown(later(3 * 1440 + 4 * 60 + 10), now, en)).toBe('3d 4h');
  });

  it('shows hours and padded minutes', () => {
    expect(formatCountdown(later(4 * 60 + 5), now, fr)).toBe('4 h 05');
  });

  it('shows minutes, never negative', () => {
    expect(formatCountdown(later(12), now, en)).toBe('12 min');
    expect(formatCountdown(later(-30), now, en)).toBe('0 min');
  });
});

describe('formatDate', () => {
  it('uses the server time zone and the 24 h clock from the profile', () => {
    const hass = makeHass({}, 'fr');
    expect(
      formatDate(new Date('2026-11-22T04:00:00Z'), hass, { hour: '2-digit', minute: '2-digit' }),
    ).toBe('05:00');
  });

  it('formats a weekend range', () => {
    const hass = makeHass({}, 'fr');
    expect(
      formatDateRange(new Date('2026-11-20T00:30:00Z'), new Date('2026-11-22T04:00:00Z'), hass),
    ).toMatch(/^20.+22 nov/);
  });
});

describe('localizePlural', () => {
  it('picks the singular or plural form', () => {
    const en = makeHass({}, 'en');
    expect(localizePlural(en, 'results.places', 1)).toBe('+1 place');
    expect(localizePlural(en, 'results.places', 3)).toBe('+3 places');
  });
});
