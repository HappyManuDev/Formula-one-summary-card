import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG, resolveConfig } from '../src/config';
import type { FormulaOneSummaryCardConfig } from '../src/types';

const TYPE = 'custom:formula-one-summary-card';
const resolve = (config: Record<string, unknown>) =>
  resolveConfig({ type: TYPE, ...config } as FormulaOneSummaryCardConfig);

describe('resolveConfig', () => {
  it('applies the defaults', () => {
    expect(resolve({})).toEqual({ type: TYPE, ...DEFAULT_CONFIG });
    expect(resolve({}).next_race_entity).toBe('sensor.f1_next_race');
    expect(resolve({}).mode).toBe('auto');
  });

  it('keeps user values', () => {
    const config = resolve({ mode: 'results', standings_rows: 10, show_standings: false });
    expect(config.mode).toBe('results');
    expect(config.standings_rows).toBe(10);
    expect(config.show_standings).toBe(false);
  });

  it('keeps the default when an option is undefined', () => {
    expect(resolve({ mode: undefined }).mode).toBe('auto');
  });

  it.each([
    [{ mode: 'race' }, /"mode" must be one of/],
    [{ next_race_entity: 3 }, /"next_race_entity" must be an entity id/],
    [{ show_title_fight: 'yes' }, /"show_title_fight" must be true or false/],
    [{ standings_rows: 0 }, /"standings_rows"/],
    [{ standings_rows: 2.5 }, /"standings_rows"/],
    [{ update_interval: 5 }, /"update_interval"/],
  ])('rejects %o', (config, error) => {
    expect(() => resolve(config)).toThrow(error);
  });

  it('rejects a missing configuration', () => {
    expect(() => resolveConfig(undefined as unknown as FormulaOneSummaryCardConfig)).toThrow(
      'Invalid configuration',
    );
  });
});
