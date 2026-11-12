import type { Constructor, Race } from './types';

const TEAM_COLORS: Record<string, string> = {
  red_bull: '#3671C6',
  ferrari: '#E8002D',
  mercedes: '#27F4D2',
  mclaren: '#FF8000',
  aston_martin: '#229971',
  alpine: '#FF87BC',
  williams: '#64C4FF',
  rb: '#6692FF',
  sauber: '#52E252',
  audi: '#F50537',
  haas: '#B6BABD',
  cadillac: '#C9A227',
};

const DEFAULT_TEAM_COLOR = '#888888';

const FLAGS: Record<string, string> = {
  Argentina: '🇦🇷',
  Australia: '🇦🇺',
  Austria: '🇦🇹',
  Azerbaijan: '🇦🇿',
  Bahrain: '🇧🇭',
  Belgium: '🇧🇪',
  Brazil: '🇧🇷',
  Canada: '🇨🇦',
  China: '🇨🇳',
  France: '🇫🇷',
  Germany: '🇩🇪',
  Hungary: '🇭🇺',
  Italy: '🇮🇹',
  Japan: '🇯🇵',
  Malaysia: '🇲🇾',
  Mexico: '🇲🇽',
  Monaco: '🇲🇨',
  Netherlands: '🇳🇱',
  Portugal: '🇵🇹',
  Qatar: '🇶🇦',
  'Saudi Arabia': '🇸🇦',
  Singapore: '🇸🇬',
  Spain: '🇪🇸',
  Turkey: '🇹🇷',
  UAE: '🇦🇪',
  UK: '🇬🇧',
  'United Kingdom': '🇬🇧',
  USA: '🇺🇸',
  'United States': '🇺🇸',
};

export const teamColor = (constructor: Constructor | undefined): string =>
  TEAM_COLORS[constructor?.constructorId ?? ''] ?? DEFAULT_TEAM_COLOR;

export const countryFlag = (race: Race | undefined): string =>
  FLAGS[race?.Circuit?.Location?.country ?? ''] ?? '🏁';
