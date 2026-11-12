import { RESULTS_WINDOW_HOURS, WEEKEND_LEAD_HOURS } from '../const';
import type { CardMode } from '../types';
import { sessionDate, type WeekendSession } from './sessions';
import type { F1Data } from './types';

const HOUR = 3_600_000;

/**
 * Layout to show at `now`:
 * - `off`: no next race (off-season);
 * - `results`: up to 50 hours after the start of the last race;
 * - `weekend`: from 24 hours before the first session of the next Grand Prix;
 * - `week`: the rest of the time.
 */
export function computeMode(data: F1Data, sessions: WeekendSession[], now: Date): CardMode {
  if (!sessionDate(data.next)) return 'off';
  const lastStart = sessionDate(data.last);
  if (lastStart) {
    const elapsed = now.getTime() - lastStart.getTime();
    if (elapsed >= 0 && elapsed < RESULTS_WINDOW_HOURS * HOUR) return 'results';
  }
  if (sessions.length && now.getTime() >= sessions[0].start.getTime() - WEEKEND_LEAD_HOURS * HOUR) {
    return 'weekend';
  }
  return 'week';
}
