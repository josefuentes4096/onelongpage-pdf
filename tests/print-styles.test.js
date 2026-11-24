import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildPrintCss } from '../extension/background/print-styles.js';

describe('buildPrintCss', () => {
  it('sets page margins (top may differ to fit the header)', () => {
    assert.match(buildPrintCss(1.2, 0.4), /margin: 1\.2in 0\.4in 0\.4in 0\.4in !important/);
  });

  it('disables forced page breaks', () => {
    const css = buildPrintCss(0.4, 0.4);
    assert.match(css, /break-before: auto !important/);
    assert.match(css, /page-break-after: auto !important/);
  });
});
