import type { ActionConfig, LovelaceCardConfig } from './ha-types';

export type CardMode = 'week' | 'weekend' | 'results' | 'off';
export type ModeOption = 'auto' | CardMode;

export interface FormulaOneSummaryCardConfig extends LovelaceCardConfig {
  type: string;
  next_race_entity?: string;
  last_results_entity?: string;
  standings_entity?: string;
  schedule_entity?: string;
  mode?: ModeOption;
  show_title_fight?: boolean;
  show_standings?: boolean;
  standings_rows?: number;
  update_interval?: number;
  spoiler_protection?: boolean;
  spoiler_hours?: number;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
}

/** Configuration once defaults are applied. */
export type ResolvedConfig = FormulaOneSummaryCardConfig &
  Required<
    Pick<
      FormulaOneSummaryCardConfig,
      | 'next_race_entity'
      | 'last_results_entity'
      | 'standings_entity'
      | 'schedule_entity'
      | 'mode'
      | 'show_title_fight'
      | 'show_standings'
      | 'update_interval'
      | 'spoiler_protection'
      | 'spoiler_hours'
      | 'tap_action'
      | 'hold_action'
    >
  >;
