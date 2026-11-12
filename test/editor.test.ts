import { afterEach, describe, expect, it } from 'vitest';

import { CARD_TAG, EDITOR_TAG } from '../src/const';
import { cleanConfig, type FormulaOneSummaryCardEditor } from '../src/editor';
import { FormulaOneSummaryCard } from '../src/formula-one-summary-card';
import type { FormulaOneSummaryCardConfig } from '../src/types';
import { makeHass } from './helpers';

const TYPE = `custom:${CARD_TAG}`;

interface FormLike extends HTMLElement {
  data: Record<string, unknown>;
  computeLabel: (item: { name: string }) => string;
  computeHelper: (item: { name: string }) => string | undefined;
}

async function renderEditor(config: Record<string, unknown>) {
  const editor = FormulaOneSummaryCard.getConfigElement() as FormulaOneSummaryCardEditor;
  editor.hass = makeHass({}, 'fr');
  editor.setConfig({ type: TYPE, ...config });
  document.body.appendChild(editor);
  await editor.updateComplete;
  const form = editor.shadowRoot!.querySelector('ha-form') as FormLike;
  return { editor, form };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('editor', () => {
  it('is returned by getConfigElement', () => {
    expect(FormulaOneSummaryCard.getConfigElement().tagName.toLowerCase()).toBe(EDITOR_TAG);
  });

  it('shows the defaults and the user values in the form', async () => {
    const { form } = await renderEditor({ mode: 'results' });
    expect(form.data.mode).toBe('results');
    expect(form.data.show_standings).toBe(true);
    expect(form.data.next_race_entity).toBe('sensor.f1_next_race');
  });

  it('labels fields in the user language', async () => {
    const { form } = await renderEditor({});
    expect(form.computeLabel({ name: 'mode' })).toBe('Affichage');
    expect(form.computeLabel({ name: 'tap_action' })).toBe('Action au clic');
    expect(form.computeHelper({ name: 'update_interval' })).toMatch(/secondes/);
    expect(form.computeHelper({ name: 'show_standings' })).toBeUndefined();
  });

  it('emits a cleaned configuration', async () => {
    const { editor, form } = await renderEditor({});
    let emitted: FormulaOneSummaryCardConfig | undefined;
    editor.addEventListener('config-changed', (event) => {
      emitted = (event as CustomEvent<{ config: FormulaOneSummaryCardConfig }>).detail.config;
    });
    form.dispatchEvent(
      new CustomEvent('value-changed', {
        detail: { value: { ...form.data, mode: 'weekend', standings_rows: undefined } },
      }),
    );
    expect(emitted).toEqual({ type: TYPE, mode: 'weekend' });
  });
});

describe('cleanConfig', () => {
  it('removes defaults and empty values', () => {
    expect(
      cleanConfig({
        type: TYPE,
        mode: 'auto',
        next_race_entity: 'sensor.f1_next_race',
        standings_entity: 'sensor.my_standings',
        standings_rows: undefined,
        tap_action: { action: 'none' },
      }),
    ).toEqual({ type: TYPE, standings_entity: 'sensor.my_standings' });
  });
});
