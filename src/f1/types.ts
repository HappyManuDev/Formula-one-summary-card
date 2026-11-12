// Subset of the Jolpica (Ergast-compatible) API objects stored in the sensor attributes.
// Every field is optional: the API omits some of them and sensors can be unavailable.

export interface SessionTime {
  date?: string;
  time?: string;
}

export interface Circuit {
  circuitName?: string;
  Location?: { locality?: string; country?: string };
}

export interface Race extends SessionTime {
  season?: string;
  round?: string;
  raceName?: string;
  Circuit?: Circuit;
  FirstPractice?: SessionTime;
  SecondPractice?: SessionTime;
  ThirdPractice?: SessionTime;
  Qualifying?: SessionTime;
  Sprint?: SessionTime;
  SprintQualifying?: SessionTime;
  SprintShootout?: SessionTime;
}

export interface Driver {
  code?: string;
  givenName?: string;
  familyName: string;
}

export interface Constructor {
  constructorId?: string;
  name?: string;
}

export interface RaceResult {
  position?: string;
  grid?: string;
  status?: string;
  Driver: Driver;
  Constructor?: Constructor;
  Time?: { time?: string };
  FastestLap?: { rank?: string; Time?: { time?: string } };
}

export interface LastRace extends Race {
  Results?: RaceResult[];
}

export interface DriverStanding {
  position?: string;
  points: string;
  Driver: Driver;
  Constructors?: Constructor[];
}

export interface Standings {
  season?: string;
  round?: string;
  DriverStandings?: DriverStanding[];
}

export interface Schedule {
  season?: string;
  Races?: Race[];
}

export interface F1Data {
  next: Race;
  last: LastRace;
  standings: Standings;
  schedule: Schedule;
  results: RaceResult[];
  driverStandings: DriverStanding[];
  races: Race[];
}
