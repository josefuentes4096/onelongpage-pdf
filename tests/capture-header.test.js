import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCaptureHeader, escapeHtml } from '../extension/background/capture-header.js';

const labels = { url: 'URL', captured: 'Captured' };
const base = {
  capturedAt: new Date('2026-11-24T17:03:22Z'),
  paperWidthIn: 210 / 25.4,
  marginIn: 10 / 25.4,
  labels,
};

describe('escapeHtml', () => {
  it('escapes all HTML-significant characters', () => {
    assert.equal(escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
});

describe('buildCaptureHeader', () => {
  it('includes the full URL and the UTC timestamp', () => {
    const url = 'https://example.com/article?id=123&ref=abc';
    const { html } = buildCaptureHeader({ ...base, url });
    assert.match(html, /https:\/\/example\.com\/article\?id=123&amp;ref=abc/);
    assert.match(html, /2026-11-24T17:03:22Z/);
  });

  it('never truncates long URLs', () => {
    const url = `https://example.com/${'a'.repeat(2000)}`;
    const { html } = buildCaptureHeader({ ...base, url });
    assert.ok(html.includes('a'.repeat(2000)));
  });

  it('escapes markup in the URL (no injection into the PDF header)', () => {
    const url = 'https://example.com/"><img src=x onerror=alert(1)>';
    const { html } = buildCaptureHeader({ ...base, url });
    assert.doesNotMatch(html, /<img/);
  });

  it('reserves more height for longer URLs', () => {
    const short = buildCaptureHeader({ ...base, url: 'https://a.b/' });
    const long = buildCaptureHeader({ ...base, url: `https://a.b/${'x'.repeat(1000)}` });
    assert.ok(long.heightIn > short.heightIn);
    assert.ok(short.heightIn > 0);
  });
});
