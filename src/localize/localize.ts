import type { HomeAssistant } from '../ha-types';
import en from './languages/en.json';
import fr from './languages/fr.json';

type Translations = typeof en;

const LANGUAGES: Record<string, Translations> = { en, fr };

export function languageOf(hass?: HomeAssistant): string {
  return hass?.locale?.language ?? hass?.language ?? 'en';
}

function lookup(translations: Translations, key: string): string | undefined {
  const value = key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      translations,
    );
  return typeof value === 'string' ? value : undefined;
}

/**
 * Translated string for a dotted key such as "moon_phase.full_moon", in the
 * user's language with English fallback. `{name}` placeholders are replaced.
 */
export function localize(
  hass: HomeAssistant | undefined,
  key: string,
  params: Record<string, string | number> = {},
): string {
  const base = languageOf(hass).split('-')[0].toLowerCase();
  const template = lookup(LANGUAGES[base] ?? en, key) ?? lookup(en, key) ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/**
 * Translated string with plural forms: uses `<key>_one` for 1 and `<key>_other`
 * otherwise. `{count}` is replaced by the number.
 */
export function localizePlural(
  hass: HomeAssistant | undefined,
  key: string,
  count: number,
  params: Record<string, string | number> = {},
): string {
  return localize(hass, `${key}_${count === 1 ? 'one' : 'other'}`, { ...params, count });
}
