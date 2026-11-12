import { css, html, LitElement, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';

import {
  DEFAULT_CONFIG,
  ENTITY_KEYS,
  MAX_STANDINGS_ROWS,
  MAX_UPDATE_INTERVAL,
  MIN_STANDINGS_ROWS,
  MIN_UPDATE_INTERVAL,
  MODES,
} from './config';
import { EDITOR_TAG } from './const';
import type { HomeAssistant } from './ha-types';
import { localize } from './localize/localize';
import type { FormulaOneSummaryCardConfig } from './types';

interface SchemaItem {
  name: string;
  type?: 'grid' | 'expandable';
  flatten?: boolean;
  icon?: string;
  selector?: Record<string, unknown>;
  schema?: SchemaItem[];
}

function buildSchema(hass?: HomeAssistant): SchemaItem[] {
  return [
    {
      name: 'mode',
      selector: {
        select: {
          mode: 'dropdown',
          options: MODES.map((mode) => ({
            value: mode,
            label: localize(hass, `editor.mode_options.${mode}`),
          })),
        },
      },
    },
    {
      name: '',
      type: 'grid',
      schema: [
        { name: 'show_title_fight', selector: { boolean: {} } },
        { name: 'show_standings', selector: { boolean: {} } },
      ],
    },
    {
      name: 'standings_rows',
      selector: {
        number: { min: MIN_STANDINGS_ROWS, max: MAX_STANDINGS_ROWS, step: 1, mode: 'box' },
      },
    },
    {
      name: 'update_interval',
      selector: {
        number: {
          min: MIN_UPDATE_INTERVAL,
          max: MAX_UPDATE_INTERVAL,
          step: 10,
          mode: 'box',
          unit_of_measurement: 's',
        },
      },
    },
    {
      name: 'entities',
      type: 'expandable',
      flatten: true,
      icon: 'mdi:database',
      schema: ENTITY_KEYS.map((key) => ({
        name: key,
        selector: { entity: { filter: { domain: 'sensor' } } },
      })),
    },
    {
      name: 'interactions',
      type: 'expandable',
      flatten: true,
      icon: 'mdi:gesture-tap',
      schema: [
        { name: 'tap_action', selector: { ui_action: {} } },
        { name: 'hold_action', selector: { ui_action: {} } },
      ],
    },
  ];
}

const isEmpty = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  value === '' ||
  (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0);

const isDefault = (key: string, value: unknown): boolean =>
  key !== 'type' &&
  key in DEFAULT_CONFIG &&
  JSON.stringify(DEFAULT_CONFIG[key as keyof typeof DEFAULT_CONFIG]) === JSON.stringify(value);

/**
 * Removes empty values and values equal to their default, so that the saved
 * YAML only contains what the user actually changed.
 */
export function cleanConfig(config: FormulaOneSummaryCardConfig): FormulaOneSummaryCardConfig {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (!isDefault(key, value) && !isEmpty(value)) {
      cleaned[key] = value;
    }
  }
  return cleaned as FormulaOneSummaryCardConfig;
}

export class FormulaOneSummaryCardEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: FormulaOneSummaryCardConfig;

  public setConfig(config: FormulaOneSummaryCardConfig): void {
    this._config = config;
  }

  private _computeLabel = (item: SchemaItem): string =>
    localize(this.hass, `editor.${item.name}.label`);

  private _computeHelper = (item: SchemaItem): string | undefined => {
    const key = `editor.${item.name}.helper`;
    const helper = localize(this.hass, key);
    return helper === key ? undefined : helper;
  };

  private _valueChanged(event: CustomEvent<{ value: FormulaOneSummaryCardConfig }>): void {
    event.stopPropagation();
    const config = cleanConfig({ ...event.detail.value, type: this._config?.type ?? '' });
    this._config = config;
    this.dispatchEvent(
      new CustomEvent('config-changed', { detail: { config }, bubbles: true, composed: true }),
    );
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }
    // Defaults are shown in the form, but only changed values are saved.
    const data = { ...DEFAULT_CONFIG, ...this._config };
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${buildSchema(this.hass)}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  static styles = css`
    ha-form {
      display: block;
    }
  `;
}

if (!customElements.get(EDITOR_TAG)) {
  customElements.define(EDITOR_TAG, FormulaOneSummaryCardEditor);
}
