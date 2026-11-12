import { html, LitElement, nothing, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';

import { ENTITY_KEYS, resolveConfig } from './config';
import {
  CARD_DESCRIPTION,
  CARD_NAME,
  CARD_TAG,
  CARD_VERSION,
  DOCUMENTATION_URL,
  EDITOR_TAG,
} from './const';
import './editor';
import { readF1Data } from './f1/data';
import { computeMode } from './f1/mode';
import { upcomingSession, weekendSessions } from './f1/sessions';
import { computeTitleFight } from './f1/title-fight';
import type { HomeAssistant, LovelaceGridOptions } from './ha-types';
import { localize } from './localize/localize';
import {
  renderCountdown,
  renderGrandPrix,
  renderHeader,
  renderNextRaceFooter,
  renderOffSeason,
  renderResults,
  renderSessions,
  renderStandings,
  renderTitleFight,
  type RenderContext,
} from './render/blocks';
import { cardStyles } from './styles';
import type { CardMode, FormulaOneSummaryCardConfig, ResolvedConfig } from './types';
import { type ActionKind, bindActions, hasAction } from './utils/actions';

/** Drivers shown in the standings when `standings_rows` is not set. */
const DEFAULT_STANDINGS_ROWS: Record<CardMode, number> = {
  week: 5,
  weekend: 3,
  results: 3,
  off: 5,
};

export class FormulaOneSummaryCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: ResolvedConfig;

  private _timer?: ReturnType<typeof setInterval>;
  private _unbindActions?: () => void;

  public static getStubConfig(): Partial<FormulaOneSummaryCardConfig> {
    return {};
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement(EDITOR_TAG);
  }

  public setConfig(config: FormulaOneSummaryCardConfig): void {
    this._config = resolveConfig(config);
    if (this.isConnected) {
      this._startTimer();
    }
  }

  public getCardSize(): number {
    return 6;
  }

  public getGridOptions(): LovelaceGridOptions {
    return { columns: 12, rows: 'auto', min_columns: 6 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._startTimer();
    this._unbindActions = bindActions(this, (kind) => this._handleAction(kind));
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    clearInterval(this._timer);
    this._timer = undefined;
    this._unbindActions?.();
    this._unbindActions = undefined;
  }

  /** Re-renders periodically so countdowns and live sessions stay current between sensor updates. */
  private _startTimer(): void {
    clearInterval(this._timer);
    const seconds = this._config?.update_interval ?? 60;
    this._timer = setInterval(() => this.requestUpdate(), seconds * 1000);
  }

  private _handleAction(kind: ActionKind): void {
    if (!this._config) return;
    const action = kind === 'tap' ? this._config.tap_action : this._config.hold_action;
    if (!hasAction(action)) return;
    this.dispatchEvent(
      new CustomEvent('hass-action', {
        bubbles: true,
        composed: true,
        detail: {
          config: {
            entity: this._config.next_race_entity,
            tap_action: this._config.tap_action,
            hold_action: this._config.hold_action,
          },
          action: kind,
        },
      }),
    );
  }

  /** `hass` changes on every state change in the house: only re-render when relevant. */
  protected shouldUpdate(changed: PropertyValues<this>): boolean {
    if (!changed.has('hass') || changed.size > 1) {
      return true;
    }
    const previous = changed.get('hass') as HomeAssistant | undefined;
    if (!previous || !this.hass || !this._config) {
      return true;
    }
    const config = this._config;
    return (
      ENTITY_KEYS.some((key) => previous.states[config[key]] !== this.hass!.states[config[key]]) ||
      previous.locale !== this.hass.locale ||
      previous.language !== this.hass.language ||
      previous.config !== this.hass.config
    );
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }
    const config = this._config;
    const hass = this.hass;
    if (!hass.states[config.next_race_entity]) {
      return html`
        <ha-card>
          <div class="warning">
            ${localize(hass, 'warning.entity_not_found', { entity: config.next_race_entity })}
          </div>
        </ha-card>
      `;
    }

    const now = new Date();
    const data = readF1Data(hass, config);
    const sessions = weekendSessions(data.next);
    const mode = config.mode === 'auto' ? computeMode(data, sessions, now) : config.mode;
    const ctx: RenderContext = {
      hass,
      now,
      data,
      mode,
      sessions,
      upcoming: upcomingSession(sessions, now),
      titleFight: config.show_title_fight ? computeTitleFight(data) : undefined,
    };
    const rows = config.standings_rows ?? DEFAULT_STANDINGS_ROWS[mode];
    const standings = config.show_standings ? renderStandings(ctx, rows) : nothing;
    const titleFight = renderTitleFight(ctx);

    let round: string | undefined;
    let body;
    switch (mode) {
      case 'week':
        round = data.next.round;
        body = html`${renderGrandPrix(ctx, data.next)}${renderCountdown(ctx)}${titleFight}${standings}`;
        break;
      case 'weekend':
        round = data.next.round;
        body = html`${renderGrandPrix(ctx, data.next)}${renderSessions(ctx)}${titleFight}${standings}`;
        break;
      case 'results':
        round = data.last.round;
        body = html`${renderResults(ctx)}${titleFight}${standings}${renderNextRaceFooter(ctx)}`;
        break;
      default:
        body = html`${renderOffSeason(ctx)}${standings}`;
    }

    const interactive = hasAction(config.tap_action) || hasAction(config.hold_action);

    return html`
      <ha-card tabindex=${interactive ? '0' : '-1'} role=${interactive ? 'button' : 'region'}>
        ${renderHeader(ctx, round)}
        <div class="body">${body}</div>
      </ha-card>
    `;
  }

  static styles = cardStyles;
}

if (!customElements.get(CARD_TAG)) {
  customElements.define(CARD_TAG, FormulaOneSummaryCard);
}

window.customCards = window.customCards ?? [];
if (!window.customCards.some((card) => card.type === CARD_TAG)) {
  window.customCards.push({
    type: CARD_TAG,
    name: CARD_NAME,
    description: CARD_DESCRIPTION,
    preview: true,
    documentationURL: DOCUMENTATION_URL,
  });
}

console.info(
  `%c ${CARD_NAME.toUpperCase()} %c v${CARD_VERSION} `,
  'color: white; background: #e10600; font-weight: 700;',
  'color: #e10600; background: white; font-weight: 700;',
);
