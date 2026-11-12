import type { Race, SessionTime } from './types';

export type SessionKey =
  'fp1' | 'fp2' | 'fp3' | 'sprint_qualifying' | 'sprint' | 'qualifying' | 'race';

export type SessionStatus = 'done' | 'live' | 'next' | 'later';

export interface WeekendSession {
  key: SessionKey;
  start: Date;
  end: Date;
}

const MINUTE = 60_000;

/** Approximate duration of each session in minutes, used to show it as live. */
const DURATIONS: Record<SessionKey, number> = {
  fp1: 60,
  fp2: 60,
  fp3: 60,
  sprint_qualifying: 45,
  sprint: 60,
  qualifying: 60,
  race: 120,
};

/** Date of an API session. Without a time, noon UTC is assumed. */
export function sessionDate(session: SessionTime | undefined): Date | undefined {
  if (!session?.date) return undefined;
  const date = new Date(`${session.date}T${session.time ?? '12:00:00Z'}`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** All sessions of a Grand Prix weekend, in chronological order. */
export function weekendSessions(race: Race): WeekendSession[] {
  const sources: [SessionKey, SessionTime | undefined][] = [
    ['fp1', race.FirstPractice],
    ['fp2', race.SecondPractice],
    ['fp3', race.ThirdPractice],
    ['sprint_qualifying', race.SprintQualifying ?? race.SprintShootout],
    ['sprint', race.Sprint],
    ['qualifying', race.Qualifying],
    ['race', race],
  ];
  return sources
    .flatMap(([key, source]) => {
      const start = sessionDate(source);
      return start
        ? [{ key, start, end: new Date(start.getTime() + DURATIONS[key] * MINUTE) }]
        : [];
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** The first session that has not started yet (a live session shows its own status). */
export const upcomingSession = (
  sessions: WeekendSession[],
  now: Date,
): WeekendSession | undefined => sessions.find((session) => now < session.start);

export function sessionStatus(
  session: WeekendSession,
  now: Date,
  upcoming: WeekendSession | undefined,
): SessionStatus {
  if (now >= session.end) return 'done';
  if (now >= session.start) return 'live';
  return session === upcoming ? 'next' : 'later';
}
