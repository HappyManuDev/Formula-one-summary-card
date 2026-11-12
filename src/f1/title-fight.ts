import { MAX_POINTS_RACE, MAX_POINTS_SPRINT } from '../const';
import { toNumber } from './data';
import type { DriverStanding, F1Data, Race } from './types';

export interface Contender {
  standing: DriverStanding;
  /** Points behind the leader. */
  gap: number;
}

export interface TitleFight {
  pointsLeft: number;
  racesLeft: number;
  sprintsLeft: number;
  leader: DriverStanding;
  /** Points ahead of the second driver. */
  lead: number;
  clinched: boolean;
  /** Drivers other than the leader who can still mathematically win. */
  contenders: Contender[];
  /** Set when the leader can clinch the title at the next event. */
  matchPoint?: { race: Race; requiredLead: number };
}

/**
 * Mathematical state of the drivers' championship. Undefined when it cannot be
 * computed (no schedule, fewer than two drivers) or when no points are left.
 */
export function computeTitleFight(data: F1Data): TitleFight | undefined {
  const { races, driverStandings: standings } = data;
  if (!races.length || standings.length < 2) return undefined;

  const standingsRound = toNumber(data.standings.round);
  const lastRaceRound = toNumber(data.last.round);
  let racesLeft = 0;
  let sprintsLeft = 0;
  let nextEvent: { race: Race; maxPoints: number } | undefined;

  for (const race of races) {
    const round = toNumber(race.round);
    let maxPoints = 0;
    if (round > standingsRound) {
      racesLeft++;
      maxPoints = MAX_POINTS_RACE;
      if (race.Sprint) {
        sprintsLeft++;
        maxPoints += MAX_POINTS_SPRINT;
      }
    } else if (round === standingsRound && lastRaceRound < standingsRound) {
      // Standings already include the sprint, but the Grand Prix is still to come.
      racesLeft++;
      maxPoints = MAX_POINTS_RACE;
    }
    if (maxPoints && !nextEvent) nextEvent = { race, maxPoints };
  }

  const pointsLeft = racesLeft * MAX_POINTS_RACE + sprintsLeft * MAX_POINTS_SPRINT;
  if (pointsLeft === 0) return undefined;

  const leader = standings[0];
  const leaderPoints = toNumber(leader.points);
  const lead = leaderPoints - toNumber(standings[1].points);
  const contenders = standings
    .slice(1)
    .map((standing) => ({ standing, gap: leaderPoints - toNumber(standing.points) }))
    .filter((contender) => contender.gap <= pointsLeft);

  let matchPoint: TitleFight['matchPoint'];
  if (nextEvent) {
    // Lead needed after the next event so that nobody can catch up afterwards.
    const requiredLead = pointsLeft - nextEvent.maxPoints + 1;
    if (lead + nextEvent.maxPoints >= requiredLead) {
      matchPoint = { race: nextEvent.race, requiredLead };
    }
  }

  return {
    pointsLeft,
    racesLeft,
    sprintsLeft,
    leader,
    lead,
    clinched: lead > pointsLeft,
    contenders,
    matchPoint,
  };
}
