import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, it } from 'node:test';

const root = new URL('../extension/', import.meta.url);
const readJson = (path) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));

const locales = readdirSync(new URL('_locales/', root));
const messages = Object.fromEntries(locales.map((l) => [l, readJson(`_locales/${l}/messages.json`)]));
const manifest = readJson('manifest.json');

describe('locales', () => {
  it('include the default locale', () => {
    assert.ok(locales.includes(manifest.default_locale));
  });

  for (const locale of locales) {
    it(`"${locale}" has exactly the same keys as the default locale`, () => {
      assert.deepEqual(
        Object.keys(messages[locale]).sort(),
        Object.keys(messages[manifest.default_locale]).sort(),
      );
    });

    it(`"${locale}" declares every placeholder it uses`, () => {
      for (const [key, entry] of Object.entries(messages[locale])) {
        const used = [...entry.message.matchAll(/\$([A-Z_]+)\$/g)].map((m) => m[1].toLowerCase());
        const declared = Object.keys(entry.placeholders ?? {});
        assert.deepEqual(used.sort(), declared.sort(), `${locale}:${key}`);
      }
    });
  }

  it('every __MSG_*__ in the manifest exists', () => {
    const refs = [...JSON.stringify(manifest).matchAll(/__MSG_(\w+)__/g)].map((m) => m[1]);
    for (const ref of refs) assert.ok(ref in messages[manifest.default_locale], ref);
  });
});
