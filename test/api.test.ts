import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { API_BASE_URL, API_REFRESH_MS, CARD_TAG } from '../src/const';
import { ENDPOINTS, F1Api, refreshInterval } from '../src/f1/api';
import { buildF1Data } from '../src/f1/data';
import { computeMode } from '../src/f1/mode';
import { weekendSessions } from '../src/f1/sessions';
import { FormulaOneSummaryCard } from '../src/formula-one-summary-card';
import lastJson from './fixtures/last-results.json';
import nextJson from './fixtures/next.json';
import scheduleJson from './fixtures/schedule.json';
import standingsJson from './fixtures/driver-standings.json';
import {
  FIRST_PRACTICE,
  LAST_RACE_START,
  makeData,
  makeHass,
  NEXT_RACE,
  NEXT_RACE_START,
} from './helpers';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const at = (date: Date, offset = 0) => new Date(date.getTime() + offset);

const ANSWERS: Record<string, unknown> = {
  [`${API_BASE_URL}/next.json`]: nextJson,
  [`${API_BASE_URL}/last/results.json`]: lastJson,
  [`${API_BASE_URL}/driverStandings.json`]: standingsJson,
  [`${API_BASE_URL}.json`]: scheduleJson,
};

/** fetch mock answering the fixtures; `fail` makes every request fail. */
function mockFetch(options: { fail?: boolean; answers?: Record<string, unknown> } = {}) {
  const answers = options.answers ?? ANSWERS;
  return vi.fn(async (url: RequestInfo | URL) => {
    if (options.fail) throw new TypeError('Failed to fetch');
    const body = answers[String(url)];
    return new Response(JSON.stringify(body ?? {}), { status: body ? 200 : 404 });
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

/** Lets the pending fetch promises settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('ENDPOINTS', () => {
  it('extract the same objects as the REST sensors', () => {
    const data = buildF1Data(
      ENDPOINTS.next.extract(nextJson),
      ENDPOINTS.last.extract(lastJson),
      ENDPOINTS.standings.extract(standingsJson),
      ENDPOINTS.schedule.extract(scheduleJson),
    );
    expect(data).toEqual(makeData());
  });

  it('give an empty next race in the off-season', () => {
    const next = ENDPOINTS.next.extract({ MRData: { RaceTable: { Races: [] } } });
    expect(next).toEqual({});
    expect(computeMode(buildF1Data(next), [], new Date())).toBe('off');
  });

  it('reject malformed answers', () => {
    expect(ENDPOINTS.next.extract({})).toBeUndefined();
    expect(ENDPOINTS.standings.extract({ MRData: {} })).toBeUndefined();
  });
});

describe('refreshInterval', () => {
  const data = makeData();
  const raceEnd = at(NEXT_RACE_START, 2 * HOUR);

  it.each([
    ['between race weekends', at(FIRST_PRACTICE, -3 * 24 * HOUR), API_REFRESH_MS.week],
    ['24 hours before the first session', at(FIRST_PRACTICE, -23 * HOUR), API_REFRESH_MS.weekend],
    ['during the race weekend', at(FIRST_PRACTICE, 30 * HOUR), API_REFRESH_MS.weekend],
    ['during the race', at(NEXT_RACE_START, HOUR), API_REFRESH_MS.weekend],
    ['after the race, before its results', at(raceEnd, 10 * MINUTE), API_REFRESH_MS.results],
    ['when the results are very late', at(raceEnd, 13 * HOUR), API_REFRESH_MS.weekend],
  ])('%s', (_, now, interval) => {
    expect(refreshInterval(data, now)).toBe(interval);
  });

  it('waits for the sprint results for 2 hours', () => {
    const sprint = new Date('2026-11-21T04:00:00Z');
    const race = { ...NEXT_RACE(), Sprint: { date: '2026-11-21', time: '04:00:00Z' } };
    const sprintData = buildF1Data(race);
    expect(weekendSessions(race).some((session) => session.key === 'sprint')).toBe(true);
    expect(refreshInterval(sprintData, at(sprint, 90 * MINUTE))).toBe(API_REFRESH_MS.results);
    expect(refreshInterval(sprintData, at(sprint, 4 * HOUR))).toBe(API_REFRESH_MS.weekend);
  });

  it('refreshes every 3 hours without a next race', () => {
    expect(refreshInterval(buildF1Data(), new Date())).toBe(API_REFRESH_MS.week);
  });
});

describe('F1Api', () => {
  const now = at(LAST_RACE_START, 3 * 24 * HOUR);

  it('loads the four endpoints', async () => {
    const fetch = mockFetch();
    const api = new F1Api(fetch);
    const listener = vi.fn();
    api.subscribe(listener);
    expect(api.status).toBe('loading');

    api.refresh(now);
    await settle();

    expect(fetch).toHaveBeenCalledTimes(4);
    expect(api.status).toBe('ready');
    expect(api.data).toEqual(makeData());
    expect(listener).toHaveBeenCalled();
  });

  it('does not query the API again while the data is fresh', async () => {
    const fetch = mockFetch();
    const api = new F1Api(fetch);
    api.refresh(now);
    await settle();
    api.refresh(at(now, API_REFRESH_MS.week - MINUTE));
    await settle();
    expect(fetch).toHaveBeenCalledTimes(4);

    // The race data is stale, the season calendar is not.
    api.refresh(at(now, API_REFRESH_MS.week));
    await settle();
    expect(fetch).toHaveBeenCalledTimes(7);
    expect(fetch).not.toHaveBeenLastCalledWith(`${API_BASE_URL}.json`, expect.anything());
  });

  it('does not send the same request twice at once', async () => {
    const fetch = mockFetch();
    const api = new F1Api(fetch);
    api.refresh(now);
    api.refresh(now);
    await settle();
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('reuses the data stored by another tab', async () => {
    const first = new F1Api(mockFetch());
    first.refresh(now);
    await settle();

    const fetch = mockFetch();
    const second = new F1Api(fetch);
    expect(second.status).toBe('ready');
    second.refresh(at(now, MINUTE));
    await settle();
    expect(fetch).not.toHaveBeenCalled();
    expect(second.data).toEqual(makeData());
  });

  it('ignores a corrupted cache', () => {
    localStorage.setItem(`${CARD_TAG}:api:next`, '{not json');
    expect(new F1Api(mockFetch()).status).toBe('loading');
  });

  it('reports an error, then retries after 5 minutes', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetch = mockFetch({ fail: true });
    const api = new F1Api(fetch);
    api.refresh(now);
    await settle();
    expect(api.status).toBe('error');

    api.refresh(at(now, API_REFRESH_MS.retry - MINUTE));
    await settle();
    expect(fetch).toHaveBeenCalledTimes(4);

    api.refresh(at(now, API_REFRESH_MS.retry));
    await settle();
    expect(fetch).toHaveBeenCalledTimes(8);
  });

  it('keeps the previous data when a refresh fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    new F1Api(mockFetch()).refresh(now);
    await settle();
    const api = new F1Api(mockFetch({ fail: true }));
    api.refresh(at(now, API_REFRESH_MS.week));
    await settle();
    expect(api.status).toBe('ready');
    expect(api.data).toEqual(makeData());
  });

  it('treats an HTTP error or a malformed answer as a failure', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const api = new F1Api(mockFetch({ answers: { [`${API_BASE_URL}/next.json`]: { oops: 1 } } }));
    api.refresh(now);
    await settle();
    expect(api.status).toBe('error');
  });
});

describe('card with source: api', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('shows a loading message, then the data from the API', async () => {
    const original = FormulaOneSummaryCard.api;
    FormulaOneSummaryCard.api = new F1Api(mockFetch());
    try {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(at(LAST_RACE_START, 3 * HOUR));
      const card = document.createElement(CARD_TAG) as FormulaOneSummaryCard;
      card.setConfig({ type: `custom:${CARD_TAG}` });
      // No F1 sensor at all: the card must not need them.
      card.hass = { ...makeHass({}, 'en'), states: {} };
      document.body.appendChild(card);
      await card.updateComplete;
      expect(card.shadowRoot!.textContent).toContain('Loading Formula 1 data');

      await settle();
      await card.updateComplete;
      const text = card.shadowRoot!.textContent ?? '';
      expect(text).toContain('Brazilian Grand Prix');
      expect(card.shadowRoot!.querySelectorAll('.podium .step')).toHaveLength(3);
    } finally {
      FormulaOneSummaryCard.api = original;
    }
  });

  it('shows an error when the API cannot be reached', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const original = FormulaOneSummaryCard.api;
    FormulaOneSummaryCard.api = new F1Api(mockFetch({ fail: true }));
    try {
      const card = document.createElement(CARD_TAG) as FormulaOneSummaryCard;
      card.setConfig({ type: `custom:${CARD_TAG}` });
      card.hass = makeHass({}, 'en');
      document.body.appendChild(card);
      await settle();
      await card.updateComplete;
      expect(card.shadowRoot!.textContent).toContain('Could not reach the Jolpica API');
    } finally {
      FormulaOneSummaryCard.api = original;
    }
  });
});
