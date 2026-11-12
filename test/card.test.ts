import { afterEach, describe, expect, it, vi } from 'vitest';

import { CARD_TAG } from '../src/const';
import '../src/formula-one-summary-card';
import type { FormulaOneSummaryCard } from '../src/formula-one-summary-card';
import type { HomeAssistant } from '../src/ha-types';
import { FIRST_PRACTICE, LAST_RACE_START, makeHass, NEXT_RACE_START, STANDINGS } from './helpers';

const HOUR = 3_600_000;

async function renderCard(
  hass: HomeAssistant,
  now: Date,
  config: Record<string, unknown> = {},
): Promise<{ card: FormulaOneSummaryCard; text: string; root: ShadowRoot }> {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
  const card = document.createElement(CARD_TAG) as FormulaOneSummaryCard;
  card.setConfig({ type: `custom:${CARD_TAG}`, ...config });
  card.hass = hass;
  document.body.appendChild(card);
  await card.updateComplete;
  const root = card.shadowRoot!;
  const text = (root.textContent ?? '').replace(/\s+/g, ' ');
  return { card, text, root };
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('card', () => {
  it('registers itself in the card picker', () => {
    expect(customElements.get(CARD_TAG)).toBeDefined();
    expect(window.customCards?.some((card) => card.type === CARD_TAG)).toBe(true);
  });

  it('warns when the next race sensor is missing', async () => {
    const { text } = await renderCard(makeHass({ next: null }, 'en'), LAST_RACE_START);
    expect(text).toContain('Entity not found: sensor.f1_next_race');
  });

  it('shows the results after a race', async () => {
    const { text, root } = await renderCard(
      makeHass(),
      new Date(LAST_RACE_START.getTime() + 3 * HOUR),
    );
    expect(root.querySelector('.tag')?.textContent).toContain('Titre joué');
    expect(text).toContain('Brazilian Grand Prix');
    expect(text).toContain('Manche 20');
    expect(root.querySelectorAll('.podium .step')).toHaveLength(3);
    expect(root.querySelector('.p1 .who')?.textContent).toBe('NOR');
    expect(text).toContain('Meilleur tour');
    expect(text).toContain('STR, BOT');
    expect(text).toContain('Kimi Antonelli, champion du monde !');
    expect(root.querySelectorAll('.row.standing')).toHaveLength(3);
    expect(text).toContain('Prochain : Las Vegas Grand Prix');
  });

  it('shows the countdown during the week', async () => {
    const { text, root } = await renderCard(
      makeHass({}, 'en'),
      new Date(NEXT_RACE_START.getTime() - 5 * 24 * HOUR),
    );
    expect(root.querySelector('.tag')?.textContent).toContain('Title decided');
    expect(text).toContain('Las Vegas Grand Prix');
    expect(text).toContain('Race start');
    expect(root.querySelector('.countdown .value')?.textContent).toBe('5d 0h');
    expect(text).toContain('First session: Practice 1');
    expect(root.querySelectorAll('.row.standing')).toHaveLength(5);
  });

  it('shows the schedule during the race weekend', async () => {
    const { root } = await renderCard(
      makeHass({}, 'en'),
      new Date(FIRST_PRACTICE.getTime() + 30 * 60_000),
    );
    const sessions = [...root.querySelectorAll('.row.session')];
    expect(sessions).toHaveLength(5);
    expect(sessions[0].querySelector('.pill.live')).not.toBeNull();
    expect(sessions[1].querySelector('.pill.next')?.textContent).toBe('in 3h 00');
  });

  it('shows the title fight while it is open', async () => {
    const standings = STANDINGS();
    standings.DriverStandings![0].points = '300';
    standings.DriverStandings![1].points = '250';
    const { text, root } = await renderCard(
      makeHass({ standings }, 'en'),
      new Date(NEXT_RACE_START.getTime() - 5 * 24 * HOUR),
    );
    expect(root.querySelector('.tag')?.textContent).toContain('Next Grand Prix');
    expect(text).toContain('75 points still available (3 Grands Prix)');
    expect(text).toContain('Still in contention: Antonelli, Verstappen');
    expect(root.querySelector('.match-point')).not.toBeNull();
  });

  it('shows the champion in the off-season', async () => {
    const { text } = await renderCard(makeHass({ next: {} }, 'en'), new Date('2026-12-20'));
    expect(text).toContain('Season 2026 is over');
    expect(text).toContain('Kimi Antonelli');
    expect(text).toContain('Last race: Brazilian Grand Prix · won by Norris');
  });

  it('can force a layout and hide blocks', async () => {
    const { root } = await renderCard(makeHass(), LAST_RACE_START, {
      mode: 'week',
      show_standings: false,
      show_title_fight: false,
    });
    expect(root.querySelector('.countdown')).not.toBeNull();
    expect(root.querySelector('.row.standing')).toBeNull();
    expect(root.querySelector('.champion')).toBeNull();
  });

  it('shows as many drivers as requested', async () => {
    const { root } = await renderCard(makeHass(), LAST_RACE_START, { standings_rows: 10 });
    expect(root.querySelectorAll('.row.standing')).toHaveLength(10);
  });

  it('only re-renders for its own sensors', async () => {
    const hass = makeHass();
    const { card } = await renderCard(hass, LAST_RACE_START);
    const other = { ...hass, states: { ...hass.states, 'light.kitchen': {} as never } };
    const ownSensor = {
      ...hass,
      states: { ...hass.states, 'sensor.f1_schedule': { ...hass.states['sensor.f1_schedule'] } },
    };
    const shouldUpdate = (next: HomeAssistant) =>
      (card as unknown as { shouldUpdate(c: Map<string, unknown>): boolean }).shouldUpdate.call(
        Object.assign(Object.create(card), { hass: next }),
        new Map([['hass', hass]]),
      );
    expect(shouldUpdate(other)).toBe(false);
    expect(shouldUpdate(ownSensor)).toBe(true);
  });
});
