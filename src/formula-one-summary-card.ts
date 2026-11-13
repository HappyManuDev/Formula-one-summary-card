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
import { spoilerWindow } from './f1/spoiler';
import { computeTitleFight } from './f1/title-fight';
import type { HomeAssistant, LovelaceGridOptions } from './ha-types';
import { localize } from './localize/localize';
import {
  renderCountdown,
  renderGrandPrix,
  renderHeader,
  renderLastGrandPrix,
  renderNextRaceFooter,
  renderOffSeason,
  renderResults,
  renderSessions,
  renderSpoilerShield,
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

/** Race whose results were revealed last, shared by every card of the browser. */
const REVEALED_KEY = `${CARD_TAG}:revealed`;

function readRevealed(): string | undefined {
  try {
    return localStorage.getItem(REVEALED_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export class FormulaOneSummaryCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: ResolvedConfig;

  @state() private _revealed = readRevealed();

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

  private _reveal(key: string): void {
    this._revealed = key;
    try {
      localStorage.setItem(REVEALED_KEY, key);
    } catch {
      // Storage blocked: the results stay revealed until the page reloads.
    }
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
    const spoiler = config.spoiler_protection
      ? spoilerWindow(data, now, config.spoiler_hours)
      : undefined;
    const hidden = !!spoiler && this._revealed !== spoiler.key;
    const ctx: RenderContext = {
      hass,
      now,
      data,
      mode,
      sessions,
      upcoming: upcomingSession(sessions, now),
      // While hidden, the title fight is not rendered at all: even blurred, the shape of
      // the champion banner, and the "Title decided" header tag, would give it away.
      titleFight: config.show_title_fight && !hidden ? computeTitleFight(data) : undefined,
    };
    const rows = config.standings_rows ?? DEFAULT_STANDINGS_ROWS[mode];
    const standings = config.show_standings ? renderStandings(ctx, rows) : nothing;
    const titleFight = renderTitleFight(ctx);

    // `visible` never gives a result away; `results` is what the spoiler protection hides.
    let round: string | undefined;
    let visible;
    let results;
    switch (mode) {
      case 'week':
        round = data.next.round;
        visible = html`${renderGrandPrix(ctx, data.next)}${renderCountdown(ctx)}`;
        results = html`${titleFight}${standings}`;
        break;
      case 'weekend':
        round = data.next.round;
        visible = html`${renderGrandPrix(ctx, data.next)}${renderSessions(ctx)}`;
        results = html`${titleFight}${standings}`;
        break;
      case 'results':
        round = data.last.round;
        visible = renderLastGrandPrix(ctx);
        results = html`${renderResults(ctx)}${titleFight}${standings}${renderNextRaceFooter(ctx)}`;
        break;
      default:
        // After the last race of the season, the champion is the spoiler.
        visible = nothing;
        results = html`${renderOffSeason(ctx)}${standings}`;
    }
    const body = spoiler
      ? html`${visible}${renderSpoilerShield(ctx, results, {
          hidden,
          until: spoiler.until,
          onReveal: () => this._reveal(spoiler.key),
        })}`
      : html`${visible}${results}`;

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
