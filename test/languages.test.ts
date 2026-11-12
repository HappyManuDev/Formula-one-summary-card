import { describe, expect, it } from 'vitest';

const files = import.meta.glob<Record<string, unknown>>('../src/localize/languages/*.json', {
  eager: true,
  import: 'default',
});

function keysOf(node: unknown, prefix = ''): string[] {
  if (typeof node !== 'object' || node === null) {
    return [prefix];
  }
  return Object.entries(node).flatMap(([key, value]) =>
    keysOf(value, prefix ? `${prefix}.${key}` : key),
  );
}

const get = (root: unknown, key: string) =>
  key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], root);
const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();

const reference = files['../src/localize/languages/en.json'];
const referenceKeys = keysOf(reference).sort();
const others = Object.keys(files).filter((path) => !path.endsWith('/en.json'));

describe('translations', () => {
  it('include at least one language besides English', () => {
    expect(others.length).toBeGreaterThan(0);
  });

  describe.each(others)('%s', (path) => {
    const translation = files[path];

    it('has exactly the same keys as en.json', () => {
      expect(keysOf(translation).sort()).toEqual(referenceKeys);
    });

    it('keeps the same placeholders', () => {
      for (const key of referenceKeys) {
        expect(placeholders(get(translation, key) as string), key).toEqual(
          placeholders(get(reference, key) as string),
        );
      }
    });
  });
});
