// Renders the built card with the test fixtures and saves the README screenshots.
//
//   npm run build && npm run screenshots
//
// Uses an installed Chrome by default. Set BROWSER_CHANNEL=msedge to use Edge instead.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';

const root = new URL('..', import.meta.url);
const bundle = fileURLToPath(new URL('dist/formula-one-summary-card.js', root));
const output = (name) => fileURLToPath(new URL(`docs/images/${name}.png`, root));
const fixture = (name) =>
  JSON.parse(readFileSync(new URL(`test/fixtures/${name}.json`, root), 'utf-8')).MRData;

// Real Jolpica answers, 2026 season after round 20.
const NEXT = fixture('next').RaceTable.Races[0];
const LAST = fixture('last-results').RaceTable.Races[0];
const STANDINGS = fixture('driver-standings').StandingsTable.StandingsLists[0];
const SCHEDULE = fixture('schedule').RaceTable;

// The real title is already decided: an open fight makes a more useful preview.
const OPEN_FIGHT = structuredClone(STANDINGS);
OPEN_FIGHT.DriverStandings[0].points = '330';

const THEMES = {
  light: {
    page: '#f5f5f5',
    '--primary-text-color': '#141414',
    '--secondary-text-color': '#5e5e5e',
    '--card-background-color': '#ffffff',
    '--divider-color': '#e0e0e0',
    '--primary-color': '#03a9f4',
  },
  dark: {
    page: '#111111',
    '--primary-text-color': '#e1e1e1',
    '--secondary-text-color': '#9b9b9b',
    '--card-background-color': '#1c1c1c',
    '--divider-color': '#2e2e2e',
    '--primary-color': '#03a9f4',
  },
};

const SCENARIOS = [
  {
    name: 'preview-week',
    theme: 'light',
    language: 'en',
    now: '2026-11-15T18:00:00Z',
    standings: OPEN_FIGHT,
  },
  {
    name: 'preview-weekend',
    theme: 'dark',
    language: 'en',
    now: '2026-11-21T01:00:00Z',
    standings: OPEN_FIGHT,
  },
  {
    name: 'preview-results',
    theme: 'light',
    language: 'fr',
    now: '2026-11-08T20:00:00Z',
    standings: STANDINGS,
  },
  {
    name: 'preview-spoiler',
    theme: 'light',
    language: 'fr',
    now: '2026-11-08T20:00:00Z',
    standings: STANDINGS,
    config: { spoiler_protection: true },
  },
  {
    name: 'preview-offseason',
    theme: 'dark',
    language: 'fr',
    now: '2026-12-20T12:00:00Z',
    standings: STANDINGS,
    next: {},
  },
];

// Icons used by the card (Material Design Icons paths).
const ICONS = {
  'mdi:eye-off-outline':
    'M2,5.27L3.28,4L20,20.72L18.73,22L15.65,18.92C14.5,19.3 13.28,19.5 12,19.5C7,19.5 2.73,16.39 1,12C1.69,10.24 2.79,8.69 4.19,7.46L2,5.27M12,9A3,3 0 0,1 15,12C15,12.35 14.94,12.69 14.83,13L11,9.17C11.31,9.06 11.65,9 12,9M12,4.5C17,4.5 21.27,7.61 23,12C22.18,14.08 20.79,15.88 19,17.19L17.58,15.76C18.94,14.82 20.06,13.54 20.82,12C19.17,8.64 15.76,6.5 12,6.5C10.91,6.5 9.84,6.68 8.84,7L7.3,5.47C8.74,4.85 10.33,4.5 12,4.5M3.18,12C4.83,15.36 8.24,17.5 12,17.5C12.69,17.5 13.37,17.43 14,17.29L11.72,15C10.29,14.85 9.15,13.71 9,12.28L5.6,8.87C4.61,9.72 3.78,10.78 3.18,12Z',
};

function pageHtml(theme) {
  const variables = Object.entries(theme)
    .filter(([key]) => key.startsWith('--'))
    .map(([key, value]) => `${key}: ${value};`)
    .join(' ');
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;800&family=Noto+Color+Emoji&display=block" />
    <style>
      html, body { margin: 0; background: ${theme.page}; }
      body { ${variables} font-family: Roboto, 'Noto Color Emoji', sans-serif; }
      #frame { width: 400px; padding: 20px; background: ${theme.page}; }
    </style>
  </head>
  <body><div id="frame"></div></body>
</html>`;
}

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome' });
try {
  for (const scenario of SCENARIOS) {
    const page = await browser.newPage({
      deviceScaleFactor: 2,
      viewport: { width: 440, height: 800 },
    });
    await page.clock.setFixedTime(new Date(scenario.now));
    await page.setContent(pageHtml(THEMES[scenario.theme]), { waitUntil: 'networkidle' });
    // Minimal stand-ins for Home Assistant's <ha-card> and <ha-icon>.
    await page.evaluate((icons) => {
      customElements.define(
        'ha-icon',
        class extends HTMLElement {
          connectedCallback() {
            const path = icons[this.getAttribute('icon')] ?? '';
            this.innerHTML =
              '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">' +
              `<path d="${path}"/></svg>`;
          }
        },
      );
      customElements.define(
        'ha-card',
        class extends HTMLElement {
          connectedCallback() {
            if (this.shadowRoot) return;
            this.attachShadow({ mode: 'open' }).innerHTML =
              '<style>:host{display:block;background:var(--card-background-color);' +
              'border-radius:12px;border:1px solid var(--divider-color)}</style><slot></slot>';
          }
        },
      );
    }, ICONS);
    await page.addScriptTag({ path: bundle, type: 'module' });
    await page.waitForFunction(() => customElements.get('formula-one-summary-card'));

    await page.evaluate(
      ({ scenario, sensors }) => {
        const entity = (entity_id, attributes) => ({
          entity_id,
          state: 'ok',
          attributes,
          last_changed: '',
          last_updated: '',
        });
        const card = document.createElement('formula-one-summary-card');
        card.setConfig({ type: 'custom:formula-one-summary-card', ...scenario.config });
        card.hass = {
          states: {
            'sensor.f1_next_race': entity('sensor.f1_next_race', scenario.next ?? sensors.next),
            'sensor.f1_last_results': entity('sensor.f1_last_results', sensors.last),
            'sensor.f1_driver_standings': entity('sensor.f1_driver_standings', scenario.standings),
            'sensor.f1_schedule': entity('sensor.f1_schedule', sensors.schedule),
          },
          config: { latitude: 48.85, longitude: 2.35, time_zone: 'Europe/Paris' },
          locale: { language: scenario.language, time_format: '24', time_zone: 'server' },
          language: scenario.language,
        };
        document.getElementById('frame').appendChild(card);
        return card.updateComplete;
      },
      { scenario, sensors: { next: NEXT, last: LAST, schedule: SCHEDULE } },
    );
    await page.evaluate(() => document.fonts.ready);

    await page.locator('#frame').screenshot({ path: output(scenario.name) });
    console.log(`docs/images/${scenario.name}.png`);
    await page.close();
  }
} finally {
  await browser.close();
}
