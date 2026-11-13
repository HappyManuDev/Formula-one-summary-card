import { DEFAULT_ENTITIES } from './const';
import type { FormulaOneSummaryCardConfig, ModeOption, ResolvedConfig } from './types';

export const MODES: readonly ModeOption[] = ['auto', 'week', 'weekend', 'results', 'off'];
export const ENTITY_KEYS = Object.keys(DEFAULT_ENTITIES) as (keyof typeof DEFAULT_ENTITIES)[];
export const MIN_UPDATE_INTERVAL = 10;
// Also keeps the delay far below the setInterval limit (~24.8 days), above
// which browsers fire the timer immediately and the card re-renders in a loop.
export const MAX_UPDATE_INTERVAL = 3600;
export const MIN_STANDINGS_ROWS = 1;
export const MAX_STANDINGS_ROWS = 30;
export const MIN_SPOILER_HOURS = 0;
// One week: past that, the next race weekend has usually started.
export const MAX_SPOILER_HOURS = 168;

export const DEFAULT_CONFIG: Omit<ResolvedConfig, 'type'> = {
  ...DEFAULT_ENTITIES,
  mode: 'auto',
  show_title_fight: true,
  show_standings: true,
  update_interval: 60,
  spoiler_protection: false,
  spoiler_hours: 6,
  tap_action: { action: 'none' },
  hold_action: { action: 'none' },
};

const BOOLEAN_KEYS = ['show_title_fight', 'show_standings', 'spoiler_protection'] as const;

const isIntegerBetween = (value: unknown, min: number, max: number): boolean =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

/** Validates a user configuration and applies defaults. Throws a readable error. */
export function resolveConfig(config: FormulaOneSummaryCardConfig): ResolvedConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid configuration');
  }
  for (const key of ENTITY_KEYS) {
    if (config[key] !== undefined && typeof config[key] !== 'string') {
      throw new Error(`"${key}" must be an entity id, e.g. ${DEFAULT_ENTITIES[key]}`);
    }
  }
  if (config.mode !== undefined && !MODES.includes(config.mode)) {
    throw new Error(`"mode" must be one of: ${MODES.join(', ')}`);
  }
  for (const key of BOOLEAN_KEYS) {
    if (config[key] !== undefined && typeof config[key] !== 'boolean') {
      throw new Error(`"${key}" must be true or false`);
    }
  }
  if (
    config.standings_rows !== undefined &&
    !isIntegerBetween(config.standings_rows, MIN_STANDINGS_ROWS, MAX_STANDINGS_ROWS)
  ) {
    throw new Error(
      `"standings_rows" must be a whole number between ${MIN_STANDINGS_ROWS} and ${MAX_STANDINGS_ROWS}`,
    );
  }
  if (
    config.update_interval !== undefined &&
    !(
      typeof config.update_interval === 'number' &&
      config.update_interval >= MIN_UPDATE_INTERVAL &&
      config.update_interval <= MAX_UPDATE_INTERVAL
    )
  ) {
    throw new Error(
      `"update_interval" must be a number of seconds between ${MIN_UPDATE_INTERVAL} and ${MAX_UPDATE_INTERVAL}`,
    );
  }
  if (
    config.spoiler_hours !== undefined &&
    !isIntegerBetween(config.spoiler_hours, MIN_SPOILER_HOURS, MAX_SPOILER_HOURS)
  ) {
    throw new Error(
      `"spoiler_hours" must be a whole number of hours between ${MIN_SPOILER_HOURS} and ${MAX_SPOILER_HOURS}`,
    );
  }
  // An option explicitly set to undefined (e.g. cleared in the editor) keeps its default.
  const defined = Object.fromEntries(
    Object.entries(config).filter(([, value]) => value !== undefined),
  ) as FormulaOneSummaryCardConfig;
  return { ...DEFAULT_CONFIG, ...defined } as ResolvedConfig;
}
