// Minimal subset of Home Assistant frontend types used by the card.
// Kept local on purpose: avoids depending on the full frontend codebase.

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  config: {
    latitude: number;
    longitude: number;
    time_zone: string;
  };
  locale: {
    language: string;
    time_format?: '12' | '24' | 'language' | 'system';
    time_zone?: 'local' | 'server';
  };
  language: string;
  themes?: { darkMode?: boolean };
}

export interface ActionConfig {
  action: string;
  [key: string]: unknown;
}

export interface LovelaceCardConfig {
  type: string;
  [key: string]: unknown;
}

export interface LovelaceGridOptions {
  columns?: number | 'full';
  rows?: number | 'auto';
  min_columns?: number;
  min_rows?: number;
  max_columns?: number;
  max_rows?: number;
}

export interface CustomCardEntry {
  type: string;
  name: string;
  description?: string;
  preview?: boolean;
  documentationURL?: string;
}

declare global {
  interface Window {
    customCards?: CustomCardEntry[];
  }
}
