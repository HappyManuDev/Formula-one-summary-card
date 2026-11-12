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
    name: 'preview-offseason',
    theme: 'dark',
    language: 'fr',
    now: '2026-12-20T12:00:00Z',
    standings: STANDINGS,
    next: {},
  },
];

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
    // Minimal stand-in for Home Assistant's <ha-card>.
    await page.evaluate(() => {
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
    });
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
        card.setConfig({ type: 'custom:formula-one-summary-card' });
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
