import type { HomeAssistant } from '../ha-types';
import type { ResolvedConfig } from '../types';
import type {
  DriverStanding,
  F1Data,
  LastRace,
  Race,
  RaceResult,
  Schedule,
  Standings,
} from './types';

const attributes = <T>(hass: HomeAssistant, entityId: string): T =>
  (hass.states[entityId]?.attributes ?? {}) as T;

const hasDriver = (item: unknown): boolean =>
  typeof (item as { Driver?: { familyName?: unknown } } | null)?.Driver?.familyName === 'string';

const arrayOf = <T>(value: unknown, keep: (item: unknown) => boolean): T[] =>
  Array.isArray(value) ? (value.filter(keep) as T[]) : [];

/** Reads the four F1 sensors. Missing or malformed data gives empty values, never an error. */
export function readF1Data(hass: HomeAssistant, config: ResolvedConfig): F1Data {
  const next = attributes<Race>(hass, config.next_race_entity);
  const last = attributes<LastRace>(hass, config.last_results_entity);
  const standings = attributes<Standings>(hass, config.standings_entity);
  const schedule = attributes<Schedule>(hass, config.schedule_entity);
  return {
    next,
    last,
    standings,
    schedule,
    results: arrayOf<RaceResult>(last.Results, hasDriver),
    driverStandings: arrayOf<DriverStanding>(standings.DriverStandings, hasDriver),
    races: arrayOf<Race>(schedule.Races, (race) => !!race && typeof race === 'object'),
  };
}

/** Short driver label: three-letter code when known, family name otherwise. */
export const driverCode = (driver: { code?: string; familyName: string }): string =>
  driver.code || driver.familyName;

export const fullName = (driver: { givenName?: string; familyName: string }): string =>
  [driver.givenName, driver.familyName].filter(Boolean).join(' ');

export const toNumber = (value: string | undefined): number => {
  const number = parseFloat(value ?? '');
  return Number.isFinite(number) ? number : 0;
};
