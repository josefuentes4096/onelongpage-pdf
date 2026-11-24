import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { countPdfPages, sanitizeFilename } from '../extension/background/pdf-utils.js';

const toBase64 = (text) => Buffer.from(text, 'latin1').toString('base64');

describe('countPdfPages', () => {
  it('counts /Type /Page objects but not /Pages', () => {
    const pdf = '<< /Type /Pages /Count 2 >> << /Type /Page >> << /Type/Page /Parent 1 0 R >>';
    assert.equal(countPdfPages(toBase64(pdf)), 2);
  });

  it('returns 1 when no page objects are found or input is invalid', () => {
    assert.equal(countPdfPages(toBase64('not a pdf')), 1);
    assert.equal(countPdfPages('%%%not-base64%%%'), 1);
  });
});

describe('sanitizeFilename', () => {
  it('removes characters invalid on common file systems', () => {
    assert.equal(sanitizeFilename('a/b\\c:d*e?f"g<h>i|j'), 'a b c d e f g h i j');
  });

  it('removes control characters and collapses whitespace', () => {
    assert.equal(sanitizeFilename('  hello\n\t  world\u0007 '), 'hello world');
  });

  it('strips trailing dots (invalid on Windows)', () => {
    assert.equal(sanitizeFilename('Title...'), 'Title');
  });

  it('limits length', () => {
    assert.ok(sanitizeFilename('x'.repeat(500)).length <= 120);
  });

  it('falls back to a default name', () => {
    assert.equal(sanitizeFilename(''), 'document');
    assert.equal(sanitizeFilename('???'), 'document');
  });
});
