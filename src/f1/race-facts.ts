import { toNumber } from './data';
import type { Driver, RaceResult } from './types';

export interface RaceFacts {
  fastestLap?: { driver: Driver; time: string };
  biggestGain?: { driver: Driver; places: number };
  retirements: Driver[];
}

const CLASSIFIED = /^(Finished|Lapped|\+)/;

/** Highlights of a race: fastest lap, biggest climb from the grid, retirements. */
export function raceFacts(results: RaceResult[]): RaceFacts {
  const fastest = results.find((result) => result.FastestLap?.rank === '1');
  const fastestTime = fastest?.FastestLap?.Time?.time;

  let biggestGain: RaceFacts['biggestGain'];
  for (const result of results) {
    const grid = toNumber(result.grid);
    // Grid 0 means a pit lane start: not a meaningful starting position.
    if (grid <= 0) continue;
    const places = grid - toNumber(result.position);
    if (places > 0 && (!biggestGain || places > biggestGain.places)) {
      biggestGain = { driver: result.Driver, places };
    }
  }

  return {
    fastestLap: fastest && fastestTime ? { driver: fastest.Driver, time: fastestTime } : undefined,
    biggestGain,
    retirements: results
      .filter((result) => !CLASSIFIED.test(result.status ?? 'Finished'))
      .map((result) => result.Driver),
  };
}
