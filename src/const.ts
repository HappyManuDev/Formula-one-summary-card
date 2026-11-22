declare const __VERSION__: string;

export const CARD_VERSION = __VERSION__;
export const CARD_TAG = 'formula-one-summary-card';
export const EDITOR_TAG = 'formula-one-summary-card-editor';
export const CARD_NAME = 'Formula One Summary Card';
export const CARD_DESCRIPTION =
  'Next Grand Prix, race weekend schedule, results and title fight of the Formula 1 season.';
export const DOCUMENTATION_URL = 'https://github.com/HappyManuDev/Formula-one-summary-card';

export const DEFAULT_ENTITIES = {
  next_race_entity: 'sensor.f1_next_race',
  last_results_entity: 'sensor.f1_last_results',
  standings_entity: 'sensor.f1_driver_standings',
  schedule_entity: 'sensor.f1_schedule',
} as const;

/** 2026 points system: 25 points to the Grand Prix winner, 8 to the sprint winner, no fastest lap point. */
export const MAX_POINTS_RACE = 25;
export const MAX_POINTS_SPRINT = 8;

/** The card shows the results for this long after the start of the last race. */
export const RESULTS_WINDOW_HOURS = 50;
/** The card switches to the race weekend layout this long before the first session. */
export const WEEKEND_LEAD_HOURS = 24;

/** Jolpica API (successor of Ergast), queried directly by the browser when `source: api`. */
export const API_BASE_URL = 'https://api.jolpi.ca/ergast/f1/current';
const MINUTE_MS = 60_000;
/** How often the card refreshes the API data, depending on the race calendar. */
export const API_REFRESH_MS = {
  /** Between race weekends. */
  week: 180 * MINUTE_MS,
  /** From 24 hours before the first session until the next Grand Prix moves on. */
  weekend: 30 * MINUTE_MS,
  /** After the sprint or the race, until the results are published. */
  results: 5 * MINUTE_MS,
  /** Season calendar, only used for the title fight. */
  schedule: 12 * 60 * MINUTE_MS,
  /** After a failed request. */
  retry: 5 * MINUTE_MS,
};
/** The 5-minute polling stops this long after the end of the session, if the results are late. */
export const RESULTS_POLL_HOURS = { sprint: 2, race: 12 } as const;
/** A request taking longer than this is abandoned and retried later. */
export const API_TIMEOUT_MS = 15_000;
