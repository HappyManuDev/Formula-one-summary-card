import {
  API_BASE_URL,
  API_REFRESH_MS,
  API_TIMEOUT_MS,
  CARD_TAG,
  RESULTS_POLL_HOURS,
  WEEKEND_LEAD_HOURS,
} from '../const';
import { buildF1Data } from './data';
import { weekendSessions } from './sessions';
import type { F1Data, LastRace, Race, Schedule, Standings } from './types';

const HOUR = 3_600_000;

export type Endpoint = 'next' | 'last' | 'standings' | 'schedule';

interface ApiAnswer {
  MRData?: {
    RaceTable?: { season?: string; Races?: unknown[] };
    StandingsTable?: { StandingsLists?: unknown[] };
  };
}

/**
 * Path of each endpoint and the object the card needs from its answer: the same
 * one the REST sensors of examples/f1-sensors.yaml store as attributes. An empty
 * list (off-season, or no race yet) gives an empty object; a malformed answer
 * gives `undefined` and counts as a failed request.
 */
export const ENDPOINTS: Record<
  Endpoint,
  { path: string; extract: (json: ApiAnswer) => object | undefined }
> = {
  next: {
    path: '/next.json',
    extract: (json) => races(json) && ((races(json)![0] as Race | undefined) ?? {}),
  },
  last: {
    path: '/last/results.json',
    extract: (json) => races(json) && ((races(json)![0] as LastRace | undefined) ?? {}),
  },
  standings: {
    path: '/driverStandings.json',
    extract: (json) => {
      const lists = json?.MRData?.StandingsTable?.StandingsLists;
      return Array.isArray(lists) ? ((lists[0] as Standings | undefined) ?? {}) : undefined;
    },
  },
  schedule: {
    path: '.json',
    extract: (json) =>
      races(json) && ({ season: json.MRData!.RaceTable!.season, Races: races(json) } as Schedule),
  },
};

const ENDPOINT_KEYS = Object.keys(ENDPOINTS) as Endpoint[];

function races(json: ApiAnswer): unknown[] | undefined {
  const list = json?.MRData?.RaceTable?.Races;
  return Array.isArray(list) ? list : undefined;
}

/**
 * How long the race data stays fresh at `now`:
 * - 5 minutes after the sprint or the race, until the results are published. Jolpica's
 *   `next` only moves on once the race results are in, so the race of `next` having
 *   ended means they are still missing. Capped in case the results are very late;
 * - 30 minutes during the race weekend, from 24 hours before the first session;
 * - 3 hours the rest of the time.
 * Practice and qualifying results are not shown by the card, so they are not awaited.
 */
export function refreshInterval(data: F1Data, now: Date): number {
  const sessions = weekendSessions(data.next);
  if (!sessions.length) return API_REFRESH_MS.week;
  const time = now.getTime();
  for (const session of sessions) {
    if (session.key !== 'sprint' && session.key !== 'race') continue;
    const end = session.end.getTime();
    if (time >= end && time < end + RESULTS_POLL_HOURS[session.key] * HOUR) {
      return API_REFRESH_MS.results;
    }
  }
  if (time >= sessions[0].start.getTime() - WEEKEND_LEAD_HOURS * HOUR) {
    return API_REFRESH_MS.weekend;
  }
  return API_REFRESH_MS.week;
}

interface CacheEntry {
  fetched: number;
  data: object;
}

const storageKey = (endpoint: Endpoint) => `${CARD_TAG}:api:${endpoint}`;

function readStorage(endpoint: Endpoint): CacheEntry | undefined {
  try {
    const entry = JSON.parse(
      localStorage.getItem(storageKey(endpoint)) ?? 'null',
    ) as CacheEntry | null;
    return entry &&
      typeof entry.fetched === 'number' &&
      entry.data &&
      typeof entry.data === 'object'
      ? entry
      : undefined;
  } catch {
    return undefined;
  }
}

function writeStorage(endpoint: Endpoint, entry: CacheEntry): void {
  try {
    localStorage.setItem(storageKey(endpoint), JSON.stringify(entry));
  } catch {
    // Storage blocked or full: the data stays in memory until the page reloads.
  }
}

export type ApiStatus = 'loading' | 'ready' | 'error';

/**
 * F1 data fetched straight from the Jolpica API. Shared by every card of the page,
 * and cached in localStorage so that other tabs and reloads reuse it instead of
 * querying the API again.
 */
export class F1Api {
  private _entries: Partial<Record<Endpoint, CacheEntry>> = {};
  private _failedAt: Partial<Record<Endpoint, number>> = {};
  private _inFlight = new Set<Endpoint>();
  private _listeners = new Set<() => void>();

  constructor(private readonly _fetch: typeof fetch = (...args) => fetch(...args)) {
    ENDPOINT_KEYS.forEach((endpoint) => this._sync(endpoint));
  }

  /** Calls `listener` whenever new data arrives or a request fails. Returns the unsubscribe function. */
  public subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /** `loading` until the next race is known; `error` if its first request failed. */
  public get status(): ApiStatus {
    if (this._entries.next) return 'ready';
    return this._failedAt.next !== undefined ? 'error' : 'loading';
  }

  public get data(): F1Data {
    const [next, last, standings, schedule] = ENDPOINT_KEYS.map((key) => this._entries[key]?.data);
    return buildF1Data(
      next as Race,
      last as LastRace,
      standings as Standings,
      schedule as Schedule,
    );
  }

  /** Fetches every endpoint whose data is stale at `now`. Cheap to call often. */
  public refresh(now = new Date()): void {
    const time = now.getTime();
    let changed = false;
    for (const endpoint of ENDPOINT_KEYS) changed = this._sync(endpoint) || changed;
    if (changed) this._notify();
    const raceInterval = refreshInterval(this.data, now);
    for (const endpoint of ENDPOINT_KEYS) {
      if (this._inFlight.has(endpoint)) continue;
      const failedAt = this._failedAt[endpoint];
      if (failedAt !== undefined && time - failedAt < API_REFRESH_MS.retry) continue;
      const entry = this._entries[endpoint];
      const interval = endpoint === 'schedule' ? API_REFRESH_MS.schedule : raceInterval;
      // A clock set back in time also refreshes, rather than keeping old data for good.
      if (entry && time - entry.fetched < interval && time >= entry.fetched) continue;
      void this._load(endpoint, time);
    }
  }

  /** Takes the stored entry when another tab fetched more recently. Returns true if it did. */
  private _sync(endpoint: Endpoint): boolean {
    const stored = readStorage(endpoint);
    const entry = this._entries[endpoint];
    if (stored && (!entry || stored.fetched > entry.fetched)) {
      this._entries[endpoint] = stored;
      return true;
    }
    return false;
  }

  private _notify(): void {
    this._listeners.forEach((listener) => listener());
  }

  private async _load(endpoint: Endpoint, time: number): Promise<void> {
    this._inFlight.add(endpoint);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    try {
      const response = await this._fetch(API_BASE_URL + ENDPOINTS[endpoint].path, {
        signal: controller.signal,
        // Jolpica answers may be cached by the browser for 10 minutes: revalidate them.
        cache: 'no-cache',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = ENDPOINTS[endpoint].extract((await response.json()) as ApiAnswer);
      if (!data) throw new Error('Unexpected answer');
      const entry = { fetched: time, data };
      this._entries[endpoint] = entry;
      writeStorage(endpoint, entry);
      delete this._failedAt[endpoint];
    } catch (error) {
      this._failedAt[endpoint] = time;
      console.warn(`${CARD_TAG}: could not fetch ${ENDPOINTS[endpoint].path} from Jolpica`, error);
    } finally {
      clearTimeout(timeout);
      this._inFlight.delete(endpoint);
      this._notify();
    }
  }
}

/** Store shared by every card of the page. */
export const f1Api = new F1Api();
