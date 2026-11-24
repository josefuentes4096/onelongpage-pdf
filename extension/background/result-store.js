// @ts-check

/** @typedef {import('../shared/messages.js').CaptureResult} CaptureResult */

/** Results not picked up by the result page within this time are dropped. */
const RESULT_TTL_MS = 2 * 60 * 1000;

/** @type {Map<string, CaptureResult>} */
const results = new Map();

/**
 * Stores a result for the result page to pick up once.
 *
 * @param {CaptureResult} result
 * @returns {string} Opaque id.
 */
export function putResult(result) {
  const id = crypto.randomUUID();
  results.set(id, result);
  setTimeout(() => results.delete(id), RESULT_TTL_MS);
  return id;
}

/**
 * Returns and removes a stored result.
 *
 * @param {string} id
 * @returns {CaptureResult | null}
 */
export function takeResult(id) {
  const result = results.get(id) ?? null;
  results.delete(id);
  return result;
}
