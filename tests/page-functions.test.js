import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as pageFunctions from '../extension/background/page-functions.js';

// Page functions are sent to the page as `(${fn.toString()})(...args)`.
// They must compile on their own, without imports or module-level references.
const MODULE_LEVEL_NAMES = ['import ', 'require(', 'chrome.', 'PAGE_', 'MessageType', 'CaptureError'];

describe('page functions', () => {
  for (const [name, fn] of Object.entries(pageFunctions)) {
    it(`${name} compiles as a standalone expression`, () => {
      const compiled = new Function(`return (${fn.toString()});`)();
      assert.equal(typeof compiled, 'function');
    });

    it(`${name} does not reference extension-only identifiers`, () => {
      const source = fn.toString();
      for (const id of MODULE_LEVEL_NAMES) assert.ok(!source.includes(id), `${name} uses ${id}`);
    });
  }
});
