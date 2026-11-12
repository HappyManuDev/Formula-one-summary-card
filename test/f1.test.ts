import { describe, expect, it } from 'vitest';

import { computeMode } from '../src/f1/mode';
import { raceFacts } from '../src/f1/race-facts';
import { sessionDate, sessionStatus, upcomingSession, weekendSessions } from '../src/f1/sessions';
import { countryFlag, teamColor } from '../src/f1/teams';
import { computeTitleFight } from '../src/f1/title-fight';
import type { Race } from '../src/f1/types';
import {
  FIRST_PRACTICE,
  LAST_RACE,
  LAST_RACE_START,
  NEXT_RACE,
  NEXT_RACE_START,
  makeData,
  SCHEDULE,
  STANDINGS,
} from './helpers';

const HOUR = 3_600_000;
const at = (date: Date, hours: number) => new Date(date.getTime() + hours * HOUR);

describe('sessions', () => {
  it('parses API dates, assuming noon UTC without a time', () => {
    expect(sessionDate({ date: '2026-11-22', time: '04:00:00Z' })?.toISOString()).toBe(
      '2026-11-22T04:00:00.000Z',
    );
    expect(sessionDate({ date: '2026-11-22' })?.toISOString()).toBe('2026-11-22T12:00:00.000Z');
    expect(sessionDate({})).toBeUndefined();
    expect(sessionDate({ date: 'soon' })).toBeUndefined();
  });

  it('lists the weekend sessions in order', () => {
    const sessions = weekendSessions(NEXT_RACE());
    expect(sessions.map((session) => session.key)).toEqual([
      'fp1',
      'fp2',
      'fp3',
      'qualifying',
      'race',
    ]);
    expect(sessions[0].start).toEqual(FIRST_PRACTICE);
  });

  it('includes sprint sessions, and the old sprint shootout name', () => {
    const race: Race = {
      date: '2026-05-03',
      time: '20:00:00Z',
      FirstPractice: { date: '2026-05-01', time: '16:30:00Z' },
      SprintShootout: { date: '2026-05-01', time: '20:30:00Z' },
      Sprint: { date: '2026-05-02', time: '16:00:00Z' },
      Qualifying: { date: '2026-05-02', time: '20:00:00Z' },
    };
    expect(weekendSessions(race).map((session) => session.key)).toEqual([
      'fp1',
      'sprint_qualifying',
      'sprint',
      'qualifying',
      'race',
    ]);
  });

  it('gives the status of each session', () => {
    const sessions = weekendSessions(NEXT_RACE());
    const now = at(FIRST_PRACTICE, 0.5);
    const upcoming = upcomingSession(sessions, now);
    expect(upcoming?.key).toBe('fp2');
    expect(sessionStatus(sessions[0], now, upcoming)).toBe('live');
    expect(sessionStatus(sessions[1], now, upcoming)).toBe('next');

    expect(sessionStatus(sessions[2], now, upcoming)).toBe('later');
    const later = at(FIRST_PRACTICE, 2);
    const next = upcomingSession(sessions, later);
    expect(sessionStatus(sessions[0], later, next)).toBe('done');
    expect(sessionStatus(sessions[1], later, next)).toBe('next');
  });
});

describe('computeMode', () => {
  const data = makeData();
  const sessions = weekendSessions(data.next);

  it('shows the results up to 50 hours after the last race', () => {
    expect(computeMode(data, sessions, at(LAST_RACE_START, 2))).toBe('results');
    expect(computeMode(data, sessions, at(LAST_RACE_START, 49))).toBe('results');
    expect(computeMode(data, sessions, at(LAST_RACE_START, 51))).toBe('week');
  });

  it('switches to the race weekend 24 hours before the first session', () => {
    expect(computeMode(data, sessions, at(FIRST_PRACTICE, -25))).toBe('week');
    expect(computeMode(data, sessions, at(FIRST_PRACTICE, -23))).toBe('weekend');
    expect(computeMode(data, sessions, NEXT_RACE_START)).toBe('weekend');
  });

  it('is the off-season without a next race', () => {
    expect(computeMode(makeData({ next: {} }), [], at(LAST_RACE_START, 2))).toBe('off');
  });
});

describe('computeTitleFight', () => {
  it('detects a clinched title (real 2026 data)', () => {
    // Antonelli 390, Verstappen 279 after round 20; 3 Grands Prix and no sprint left.
    const fight = computeTitleFight(makeData())!;
    expect(fight.racesLeft).toBe(3);
    expect(fight.sprintsLeft).toBe(0);
    expect(fight.pointsLeft).toBe(75);
    expect(fight.lead).toBe(111);
    expect(fight.clinched).toBe(true);
    expect(fight.leader.Driver.familyName).toBe('Antonelli');
  });

  it('lists the contenders and the match point', () => {
    const standings = STANDINGS();
    standings.DriverStandings![0].points = '300';
    standings.DriverStandings![1].points = '250';
    standings.DriverStandings![2].points = '226';
    const fight = computeTitleFight(makeData({ standings }))!;
    expect(fight.clinched).toBe(false);
    expect(fight.contenders.map((c) => [c.standing.Driver.familyName, c.gap])).toEqual([
      ['Verstappen', 50],
      ['Russell', 74],
      ['Hamilton', 39],
      ['Leclerc', 51],
      ['Norris', 54],
    ]);
    // 75 points left, 25 at the next race: 51 points of lead needed after it.
    expect(fight.matchPoint?.requiredLead).toBe(51);
    expect(fight.matchPoint?.race.raceName).toBe('Las Vegas Grand Prix');
  });

  it('has no match point when the lead is too small', () => {
    const standings = STANDINGS();
    standings.DriverStandings![0].points = '280';
    standings.DriverStandings![1].points = '279';
    expect(computeTitleFight(makeData({ standings }))!.matchPoint).toBeUndefined();
  });

  it('counts sprints still to run', () => {
    const standings = STANDINGS();
    standings.round = '16';
    const last = LAST_RACE();
    last.round = '16';
    // Rounds 17 (sprint) to 23 are left.
    const fight = computeTitleFight(makeData({ standings, last }))!;
    expect(fight.racesLeft).toBe(7);
    expect(fight.sprintsLeft).toBe(1);
    expect(fight.pointsLeft).toBe(7 * 25 + 8);
  });

  it('keeps the Grand Prix when standings already include the sprint', () => {
    const standings = STANDINGS();
    standings.round = '17';
    const last = LAST_RACE();
    last.round = '16';
    const fight = computeTitleFight(makeData({ standings, last }))!;
    expect(fight.racesLeft).toBe(7);
    expect(fight.sprintsLeft).toBe(0);
  });

  it('is undefined without schedule or when no points are left', () => {
    expect(computeTitleFight(makeData({ schedule: null }))).toBeUndefined();
    const standings = STANDINGS();
    standings.round = '23';
    const last = LAST_RACE();
    last.round = '23';
    expect(computeTitleFight(makeData({ standings, last }))).toBeUndefined();
  });

  it('ignores malformed entries', () => {
    const schedule = SCHEDULE();
    const standings = STANDINGS();
    standings.DriverStandings!.unshift({} as never);
    expect(makeData({ schedule, standings }).driverStandings[0].Driver.familyName).toBe(
      'Antonelli',
    );
  });
});

describe('raceFacts', () => {
  it('finds the fastest lap, the biggest climb and the retirements (real data)', () => {
    const facts = raceFacts(makeData().results);
    expect(facts.fastestLap).toEqual({
      driver: expect.objectContaining({ code: 'ANT' }),
      time: '1:12.689',
    });
    expect(facts.biggestGain?.driver.code).toBe('VER');
    expect(facts.biggestGain?.places).toBe(19);
    expect(facts.retirements.map((driver) => driver.code)).toEqual(['STR', 'BOT']);
  });

  it('works with no results', () => {
    expect(raceFacts([])).toEqual({
      fastestLap: undefined,
      biggestGain: undefined,
      retirements: [],
    });
  });
});

describe('teams and flags', () => {
  it('maps constructors to colors with a fallback', () => {
    expect(teamColor({ constructorId: 'ferrari' })).toBe('#E8002D');
    expect(teamColor({ constructorId: 'unknown' })).toBe('#888888');
    expect(teamColor(undefined)).toBe('#888888');
  });

  it('maps countries to flags with a fallback', () => {
    expect(countryFlag(NEXT_RACE())).toBe('🇺🇸');
    expect(countryFlag({ Circuit: { Location: { country: 'Atlantis' } } })).toBe('🏁');
  });
});
