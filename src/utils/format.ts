import type { HomeAssistant } from '../ha-types';
import { languageOf, localize } from '../localize/localize';

type HourCycle = 'h11' | 'h12' | 'h23' | 'h24';

function hourCycle(hass: HomeAssistant): HourCycle | undefined {
  switch (hass.locale?.time_format) {
    case '12':
      return 'h12';
    case '24':
      return 'h23';
    case 'system':
      return new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hourCycle;
    default:
      // 'language': let the language decide.
      return undefined;
  }
}

/**
 * Formats a date following the user's Home Assistant profile: language,
 * 12 h / 24 h clock and browser or server time zone.
 */
export function formatDate(
  date: Date,
  hass: HomeAssistant,
  options: Intl.DateTimeFormatOptions,
): string {
  const resolved: Intl.DateTimeFormatOptions = { ...options };
  const cycle = hourCycle(hass);
  if (cycle && options.hour) {
    resolved.hourCycle = cycle;
  }
  if (hass.locale?.time_zone === 'server' && hass.config?.time_zone) {
    resolved.timeZone = hass.config.time_zone;
  }
  return new Intl.DateTimeFormat(languageOf(hass), resolved).format(date);
}

/** Time left until `target`, e.g. "3d 4h", "4h 05", "12 min". Never negative. */
export function formatCountdown(target: Date, now: Date, hass: HomeAssistant): string {
  let minutes = Math.max(0, Math.round((target.getTime() - now.getTime()) / 60_000));
  const days = Math.floor(minutes / 1440);
  minutes -= days * 1440;
  const hours = Math.floor(minutes / 60);
  minutes -= hours * 60;
  if (days > 0) return localize(hass, 'countdown.days', { days, hours });
  if (hours > 0) {
    return localize(hass, 'countdown.hours', { hours, minutes: String(minutes).padStart(2, '0') });
  }
  return localize(hass, 'countdown.minutes', { minutes });
}

/** Date range of a weekend, e.g. "13–15 Jun" or "30 May – 1 Jun" depending on the language. */
export function formatDateRange(start: Date, end: Date, hass: HomeAssistant): string {
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  if (hass.locale?.time_zone === 'server' && hass.config?.time_zone) {
    options.timeZone = hass.config.time_zone;
  }
  return new Intl.DateTimeFormat(languageOf(hass), options).formatRange(start, end);
}
