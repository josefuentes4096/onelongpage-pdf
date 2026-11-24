// @ts-check

/**
 * @typedef {object} CaptureOptions
 * @property {number} paperWidthMm Paper width in millimetres.
 * @property {number} marginMm Margin on every side, in millimetres.
 * @property {boolean} background Print backgrounds and colours.
 * @property {boolean} loadLazy Scroll the page first so lazy content loads.
 * @property {boolean} hideOverlays Hide cookie banners, modals and fixed bars.
 * @property {boolean} saveAs Ask where to save the file.
 */

/** Paper widths offered in the UI (mm). */
export const PAPER_WIDTHS_MM = Object.freeze([210, 216, 297, 148, 100]);

export const MARGIN_MIN_MM = 0;
export const MARGIN_MAX_MM = 50;

/** @type {Readonly<CaptureOptions>} */
export const DEFAULT_OPTIONS = Object.freeze({
  paperWidthMm: 210,
  marginMm: 10,
  background: true,
  loadLazy: true,
  hideOverlays: true,
  saveAs: false,
});

const STORAGE_KEY = 'options';

/**
 * Returns a valid, complete set of options from untrusted input
 * (storage, messages), falling back to defaults field by field.
 *
 * @param {unknown} raw
 * @returns {CaptureOptions}
 */
export function normalizeOptions(raw) {
  const input = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
  const bool = (/** @type {keyof CaptureOptions} */ key) =>
    typeof input[key] === 'boolean'
      ? /** @type {boolean} */ (input[key])
      : /** @type {boolean} */ (DEFAULT_OPTIONS[key]);

  const width = Number(input.paperWidthMm);
  const margin = Number(input.marginMm);

  return {
    paperWidthMm: PAPER_WIDTHS_MM.includes(width) ? width : DEFAULT_OPTIONS.paperWidthMm,
    marginMm: Number.isFinite(margin)
      ? Math.min(MARGIN_MAX_MM, Math.max(MARGIN_MIN_MM, Math.round(margin)))
      : DEFAULT_OPTIONS.marginMm,
    background: bool('background'),
    loadLazy: bool('loadLazy'),
    hideOverlays: bool('hideOverlays'),
    saveAs: bool('saveAs'),
  };
}

/** @returns {Promise<CaptureOptions>} */
export async function loadOptions() {
  const stored = await chrome.storage.sync.get(STORAGE_KEY);
  return normalizeOptions(stored[STORAGE_KEY]);
}

/**
 * @param {unknown} options
 * @returns {Promise<void>}
 */
export async function saveOptions(options) {
  await chrome.storage.sync.set({ [STORAGE_KEY]: normalizeOptions(options) });
}
