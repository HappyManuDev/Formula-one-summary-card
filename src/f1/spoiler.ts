import { sessionDate } from './sessions';
import type { F1Data } from './types';

const HOUR = 3_600_000;

/** Estimated race duration: the protection delay counts from the end of the race. */
export const RACE_DURATION_HOURS = 2;

export interface SpoilerWindow {
  /** Identifies the race, to remember that its results were revealed. */
  key: string;
  /** The results show by themselves from then on. */
  until: Date;
}

/**
 * Spoiler protection window of the latest race that has started: from its start
 * until `hours` after its estimated end. Undefined outside that window.
 *
 * Both sensors are checked: while the race runs, the next race sensor still points
 * to it; afterwards the last results sensor does.
 */
export function spoilerWindow(data: F1Data, now: Date, hours: number): SpoilerWindow | undefined {
  const started = [sessionDate(data.next), sessionDate(data.last)].filter(
    (date): date is Date => !!date && date.getTime() <= now.getTime(),
  );
  if (!started.length) return undefined;
  const start = new Date(Math.max(...started.map((date) => date.getTime())));
  const until = new Date(start.getTime() + (RACE_DURATION_HOURS + hours) * HOUR);
  return now < until ? { key: start.toISOString(), until } : undefined;
}
