import { css } from 'lit';

// Accent and texts can be overridden with CSS variables (theme or card-mod).
// Texts default to the Home Assistant theme colors, so the card works in light and dark mode.
export const cardStyles = css`
  :host {
    --f1sc-accent: var(--f1sc-accent-color, #e10600);
    --f1sc-accent-dark: var(--f1sc-accent-dark-color, #9e0400);
  }

  ha-card {
    display: block;
    overflow: hidden;
    color: var(--primary-text-color);
    outline: none;
    /* Themes give ha-card a tall line-height (~1.5); keep the card compact and the same in every theme. */
    line-height: normal;
  }

  ha-card[role='button'] {
    cursor: pointer;
  }

  ha-card:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .warning {
    padding: 16px;
    color: var(--error-color, #db4437);
  }

  .header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: linear-gradient(90deg, var(--f1sc-accent), var(--f1sc-accent-dark));
    color: #fff;
    font-weight: 800;
    font-size: 13px;
    letter-spacing: 0.5px;
  }

  .header .round {
    font-weight: 500;
    opacity: 0.85;
    font-size: 12px;
  }

  .header .tag {
    margin-left: auto;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    background: rgba(255, 255, 255, 0.2);
    padding: 3px 9px;
    border-radius: 10px;
  }

  .body {
    padding: 12px 14px 14px;
  }

  .gp {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .gp .flag {
    font-size: 32px;
    line-height: 1;
  }

  .gp .name {
    font-size: 18px;
    font-weight: 800;
  }

  .sub {
    font-size: 12px;
    color: var(--secondary-text-color);
  }

  .countdown {
    margin: 12px 0 4px;
    text-align: center;
    padding: 12px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--f1sc-accent) 8%, transparent);
  }

  .countdown .label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--secondary-text-color);
  }

  .countdown .value {
    font-size: 28px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    margin: 2px 0;
  }

  .section {
    margin: 14px 0 4px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--secondary-text-color);
  }

  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 0;
    font-size: 13px;
    border-bottom: 1px solid var(--divider-color);
  }

  .row:last-child {
    border-bottom: none;
  }

  .row.done {
    opacity: 0.5;
  }

  .pos {
    width: 18px;
    text-align: right;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .bar {
    width: 4px;
    height: 16px;
    border-radius: 2px;
    flex: none;
  }

  .driver {
    flex: 1;
    font-weight: 600;
  }

  .team {
    margin-left: 6px;
    font-size: 11px;
    font-weight: 400;
    color: var(--secondary-text-color);
  }

  .points {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .gap {
    width: 40px;
    text-align: right;
    font-size: 11px;
    color: var(--secondary-text-color);
    font-variant-numeric: tabular-nums;
  }

  .when {
    font-size: 12px;
    color: var(--secondary-text-color);
    text-transform: capitalize;
  }

  .pill {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 10px;
    white-space: nowrap;
  }

  .pill.done {
    background: var(--divider-color);
    color: var(--secondary-text-color);
  }

  .pill.live {
    background: var(--f1sc-accent);
    color: #fff;
    animation: blink 1.2s infinite;
  }

  .pill.next {
    background: color-mix(in srgb, var(--f1sc-accent) 15%, transparent);
    color: var(--f1sc-accent);
  }

  @keyframes blink {
    50% {
      opacity: 0.45;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pill.live {
      animation: none;
    }
  }

  .podium {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 6px;
    align-items: end;
    margin-top: 12px;
  }

  .step {
    text-align: center;
  }

  .step .who {
    font-size: 15px;
    font-weight: 800;
  }

  .step .time {
    font-size: 11px;
    color: var(--secondary-text-color);
    font-variant-numeric: tabular-nums;
  }

  .step .block {
    margin-top: 4px;
    border-radius: 8px 8px 0 0;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    font-size: 20px;
    font-weight: 800;
    display: flex;
    justify-content: center;
    padding-top: 6px;
  }

  .p1 .block {
    height: 70px;
  }

  .p2 .block {
    height: 52px;
  }

  .p3 .block {
    height: 40px;
  }

  .facts {
    display: flex;
    gap: 6px;
    margin-top: 10px;
  }

  .fact {
    flex: 1;
    padding: 8px;
    border-radius: 10px;
    background: rgba(127, 127, 127, 0.12);
    font-size: 12px;
    font-weight: 600;
  }

  .fact b {
    display: block;
    margin-bottom: 2px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--secondary-text-color);
  }

  .foot {
    margin-top: 10px;
    font-size: 12px;
    color: var(--secondary-text-color);
  }

  .foot b {
    color: var(--primary-text-color);
  }

  .title-fight {
    font-size: 13px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .title-fight .sub,
  .champion .sub {
    font-size: 11px;
  }

  .match-point {
    margin-top: 2px;
    padding: 6px 8px;
    border-radius: 8px;
    background: rgba(255, 179, 0, 0.14);
  }

  /* Spoiler protection: the results blur and lose their colors (team colors would
     give the podium away), under a frosted badge that reveals them. */
  .spoiler {
    position: relative;
  }

  .spoiler-content {
    transition:
      filter 0.6s ease,
      opacity 0.6s ease;
  }

  .spoiler.hidden .spoiler-content {
    filter: blur(9px) grayscale(1);
    opacity: 0.55;
    pointer-events: none;
    user-select: none;
  }

  .spoiler.hidden {
    min-height: 150px;
    margin-top: 8px;
  }

  .veil {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
    border: none;
    border-radius: 12px;
    background: radial-gradient(
      ellipse at center,
      color-mix(in srgb, var(--card-background-color, #fff) 55%, transparent),
      transparent 75%
    );
    color: inherit;
    font: inherit;
    cursor: pointer;
    transition:
      opacity 0.4s ease,
      visibility 0.4s;
  }

  .spoiler:not(.hidden) .veil {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }

  .veil:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }

  .veil-badge {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    overflow: hidden;
    padding: 18px 22px 12px;
    border-radius: 16px;
    border: 1px solid color-mix(in srgb, var(--f1sc-accent) 25%, transparent);
    background: color-mix(in srgb, var(--card-background-color, #fff) 78%, transparent);
    backdrop-filter: blur(6px);
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
    transition: transform 0.2s ease;
  }

  .veil:hover .veil-badge {
    transform: scale(1.03);
  }

  /* Checkered flag strip along the top of the badge. */
  .veil-flag {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 6px;
    background: repeating-conic-gradient(#111 0 25%, #fff 0 50%) 0 0 / 6px 6px;
    opacity: 0.85;
  }

  .veil-icon {
    --mdc-icon-size: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    margin-bottom: 4px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--f1sc-accent), var(--f1sc-accent-dark));
    color: #fff;
    box-shadow: 0 2px 8px color-mix(in srgb, var(--f1sc-accent) 45%, transparent);
  }

  .veil-title {
    font-size: 15px;
    font-weight: 800;
  }

  .veil-action {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--f1sc-accent);
  }

  .veil-sub {
    margin-top: 2px;
    font-size: 11px;
    color: var(--secondary-text-color);
  }

  @media (prefers-reduced-motion: reduce) {
    .spoiler-content,
    .veil,
    .veil-badge {
      transition: none;
    }
  }

  .champion {
    margin-top: 12px;
    padding: 10px 12px;
    border-radius: 12px;
    text-align: center;
    font-size: 14px;
    background: linear-gradient(135deg, rgba(212, 175, 55, 0.35), rgba(212, 175, 55, 0.1));
    border: 1px solid rgba(212, 175, 55, 0.6);
  }
`;
