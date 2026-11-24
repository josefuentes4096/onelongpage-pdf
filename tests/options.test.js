import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_OPTIONS, MARGIN_MAX_MM, normalizeOptions } from '../extension/shared/options.js';

describe('normalizeOptions', () => {
  it('returns defaults for missing or invalid input', () => {
    assert.deepEqual(normalizeOptions(undefined), DEFAULT_OPTIONS);
    assert.deepEqual(normalizeOptions(null), DEFAULT_OPTIONS);
    assert.deepEqual(normalizeOptions('nope'), DEFAULT_OPTIONS);
  });

  it('keeps valid values', () => {
    const options = {
      paperWidthMm: 297,
      marginMm: 5,
      background: false,
      loadLazy: false,
      hideOverlays: false,
      saveAs: true,
    };
    assert.deepEqual(normalizeOptions(options), options);
  });

  it('rejects paper widths that are not offered', () => {
    assert.equal(normalizeOptions({ paperWidthMm: 9999 }).paperWidthMm, DEFAULT_OPTIONS.paperWidthMm);
  });

  it('clamps and rounds the margin', () => {
    assert.equal(normalizeOptions({ marginMm: -5 }).marginMm, 0);
    assert.equal(normalizeOptions({ marginMm: 500 }).marginMm, MARGIN_MAX_MM);
    assert.equal(normalizeOptions({ marginMm: 7.6 }).marginMm, 8);
    assert.equal(normalizeOptions({ marginMm: 'abc' }).marginMm, DEFAULT_OPTIONS.marginMm);
  });

  it('accepts numeric strings from form fields', () => {
    assert.equal(normalizeOptions({ paperWidthMm: '216' }).paperWidthMm, 216);
  });

  it('ignores non-boolean flags and unknown keys', () => {
    const result = normalizeOptions({ saveAs: 'yes', evil: '<script>' });
    assert.equal(result.saveAs, DEFAULT_OPTIONS.saveAs);
    assert.equal('evil' in result, false);
  });
});
