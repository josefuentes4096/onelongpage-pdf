// @ts-check
import { PX_PER_IN } from '../shared/units.js';
import { formatLocalTimestamp, formatUtcTimestamp } from '../shared/time.js';

const FONT_SIZE_PX = 9;
const LINE_HEIGHT_PX = 12;
/** Approximate advance width of a monospace glyph, in em. */
const MONOSPACE_CHAR_EM = 0.6;
/** Top padding + separator + spacing below the header, in px. */
const VERTICAL_CHROME_PX = 24;
const MIN_SIDE_PADDING_IN = 0.2;
const MIN_CHARS_PER_LINE = 20;

/**
 * @param {string} value
 * @returns {string}
 */
export function escapeHtml(value) {
  /** @type {Record<string, string>} */
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return value.replace(/[&<>"']/g, (c) => entities[c]);
}

/**
 * @typedef {object} CaptureHeader
 * @property {string} html Template for `Page.printToPDF`'s `headerTemplate`.
 * @property {number} heightIn Top margin needed to fit the header, in inches.
 */

/**
 * Builds the header with the full URL and the capture time. It is rendered
 * by Chrome in the page margin, outside the document, so page CSS cannot hide it.
 *
 * @param {object} params
 * @param {string} params.url Captured URL (shown in full, never truncated).
 * @param {Date} params.capturedAt Capture time.
 * @param {number} params.paperWidthIn Paper width in inches.
 * @param {number} params.marginIn Side margin in inches.
 * @param {{ url: string, captured: string }} params.labels Localized labels.
 * @returns {CaptureHeader}
 */
export function buildCaptureHeader({ url, capturedAt, paperWidthIn, marginIn, labels }) {
  const sidePaddingIn = Math.max(marginIn, MIN_SIDE_PADDING_IN);
  const usableWidthPx = (paperWidthIn - 2 * sidePaddingIn) * PX_PER_IN;
  const charsPerLine = Math.max(
    MIN_CHARS_PER_LINE,
    Math.floor(usableWidthPx / (FONT_SIZE_PX * MONOSPACE_CHAR_EM)),
  );
  const urlLines = Math.ceil(`${labels.url}: ${url}`.length / charsPerLine);
  const timestampLines = 1;
  const heightIn = ((urlLines + timestampLines) * LINE_HEIGHT_PX + VERTICAL_CHROME_PX) / PX_PER_IN;

  const local = escapeHtml(formatLocalTimestamp(capturedAt));
  const utc = escapeHtml(formatUtcTimestamp(capturedAt));

  // Header templates need an explicit font-size; padding provides the side margins.
  const html = `
<div style="width:100%;box-sizing:border-box;padding:6px ${sidePaddingIn}in 0;
            font-family:Consolas,'Courier New',monospace;font-size:${FONT_SIZE_PX}px;
            line-height:${LINE_HEIGHT_PX}px;color:#333;-webkit-print-color-adjust:exact;">
  <div style="border-bottom:1px solid #999;padding-bottom:4px;">
    <div style="word-break:break-all;"><b>${escapeHtml(labels.url)}:</b> ${escapeHtml(url)}</div>
    <div><b>${escapeHtml(labels.captured)}:</b> ${local} &nbsp;(${utc})</div>
  </div>
</div>`;

  return { html, heightIn };
}
