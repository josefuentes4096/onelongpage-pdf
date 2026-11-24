// @ts-check

/**
 * Message types exchanged between extension pages and the service worker.
 * Keep this the single source of truth for message names.
 */
export const MessageType = Object.freeze({
  /** popup → worker: `{ type, tabId: number, options: CaptureOptions }` → `CaptureResponse` */
  CAPTURE_TAB: 'capture-tab',
  /** result page → worker: `{ type, id: string }` → `CaptureResult | null` */
  TAKE_RESULT: 'take-result',
});

/**
 * @typedef {{ ok: true, paperHeightIn: number } | { ok: false, error: string }} CaptureResponse
 */

/**
 * @typedef {object} CaptureResult
 * @property {string} data PDF bytes, base64-encoded.
 * @property {string} filename Suggested file name.
 * @property {boolean} saveAs Whether to show the "Save as" dialog.
 * @property {number} paperHeightIn Page height in inches.
 * @property {string} url Captured URL.
 * @property {string} capturedAt Capture time, ISO 8601 (UTC).
 */
