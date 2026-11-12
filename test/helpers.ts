// Real Jolpica API answers (2026 season, after round 20), stored the way the
// REST sensors of examples/f1-sensors.yaml expose them as attributes.
import { resolveConfig } from '../src/config';
import { readF1Data } from '../src/f1/data';
import type { F1Data, LastRace, Race, Schedule, Standings } from '../src/f1/types';
import type { HassEntity, HomeAssistant } from '../src/ha-types';
import lastJson from './fixtures/last-results.json';
import nextJson from './fixtures/next.json';
import scheduleJson from './fixtures/schedule.json';
import standingsJson from './fixtures/driver-standings.json';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const NEXT_RACE = (): Race => clone(nextJson.MRData.RaceTable.Races[0]) as Race;
export const LAST_RACE = (): LastRace => clone(lastJson.MRData.RaceTable.Races[0]) as LastRace;
export const STANDINGS = (): Standings =>
  clone(standingsJson.MRData.StandingsTable.StandingsLists[0]) as Standings;
export const SCHEDULE = (): Schedule => {
  const { season, Races } = clone(scheduleJson.MRData.RaceTable);
  return { season, Races } as Schedule;
};

/** Times relative to the fixtures. */
export const LAST_RACE_START = new Date('2026-11-08T17:00:00Z');
export const FIRST_PRACTICE = new Date('2026-11-20T00:30:00Z');
export const NEXT_RACE_START = new Date('2026-11-22T04:00:00Z');

export interface SensorData {
  next?: Race | null;
  last?: LastRace | null;
  standings?: Standings | null;
  schedule?: Schedule | null;
}

const entity = (entity_id: string, attributes: object): HassEntity => ({
  entity_id,
  state: 'ok',
  attributes: attributes as Record<string, unknown>,
  last_changed: '',
  last_updated: '',
});

/** Home Assistant mock. A sensor set to `null` is missing; `undefined` uses the fixture. */
export function makeHass(sensors: SensorData = {}, language = 'fr'): HomeAssistant {
  const sources: [string, object | null][] = [
    ['sensor.f1_next_race', sensors.next === undefined ? NEXT_RACE() : sensors.next],
    ['sensor.f1_last_results', sensors.last === undefined ? LAST_RACE() : sensors.last],
    [
      'sensor.f1_driver_standings',
      sensors.standings === undefined ? STANDINGS() : sensors.standings,
    ],
    ['sensor.f1_schedule', sensors.schedule === undefined ? SCHEDULE() : sensors.schedule],
  ];
  const states: Record<string, HassEntity> = {};
  for (const [id, attributes] of sources) {
    if (attributes) states[id] = entity(id, attributes);
  }
  return {
    states,
    config: { latitude: 48.85, longitude: 2.35, time_zone: 'Europe/Paris' },
    locale: { language, time_format: '24', time_zone: 'server' },
    language,
  };
}

export const makeData = (sensors: SensorData = {}): F1Data =>
  readF1Data(makeHass(sensors), resolveConfig({ type: 'custom:formula-one-summary-card' }));
