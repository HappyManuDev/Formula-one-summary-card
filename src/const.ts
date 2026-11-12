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
