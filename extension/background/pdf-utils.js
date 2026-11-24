// @ts-check

const MAX_FILENAME_LENGTH = 120;
const FALLBACK_FILENAME = 'document';

/**
 * Counts the pages of a PDF produced by Chrome. Page dictionaries are written
 * uncompressed by Skia, so a simple scan is reliable. Returns 1 if no page
 * objects are found (unknown structure), so callers never loop forever.
 *
 * @param {string} base64 PDF bytes, base64-encoded.
 * @returns {number}
 */
export function countPdfPages(base64) {
  let binary;
  try {
    binary = atob(base64);
  } catch {
    return 1;
  }
  const matches = binary.match(/\/Type\s*\/Page(?![a-zA-Z])/g);
  return matches ? matches.length : 1;
}

/**
 * Turns an arbitrary page title into a safe file name (without extension).
 *
 * @param {string} name
 * @returns {string}
 */
export function sanitizeFilename(name) {
  const cleaned = name
    // Characters invalid on Windows/macOS/Linux, plus control characters.
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\x00-\x1f\x7f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    // Windows forbids trailing dots/spaces.
    .replace(/[. ]+$/, '')
    .slice(0, MAX_FILENAME_LENGTH)
    .trim();
  return cleaned || FALLBACK_FILENAME;
}
