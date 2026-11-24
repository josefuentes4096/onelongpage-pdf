// @ts-check

/** CSS pixels per inch, as used by Chrome's print layout. */
export const PX_PER_IN = 96;

/** Millimetres per inch. */
export const MM_PER_IN = 25.4;

/** Centimetres per inch. */
export const CM_PER_IN = 2.54;

/**
 * Chromium refuses to print pages taller than 65536 pt (~910 in, ~23.1 m)
 * ("Printing failed"). Stay a little below that.
 */
export const MAX_PAPER_HEIGHT_IN = 900;

/**
 * @param {number} mm
 * @returns {number}
 */
export function mmToIn(mm) {
  return mm / MM_PER_IN;
}
