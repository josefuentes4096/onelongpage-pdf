// @ts-check

/**
 * CSS injected before printing: page margins matching `printToPDF`, no inner
 * scroll containers on the root, and no forced page breaks (one endless page).
 *
 * @param {number} marginTopIn
 * @param {number} marginIn
 * @returns {string}
 */
export function buildPrintCss(marginTopIn, marginIn) {
  return `
@page { size: auto !important; margin: ${marginTopIn}in ${marginIn}in ${marginIn}in ${marginIn}in !important; }
html, body {
  height: auto !important; min-height: 0 !important; max-height: none !important;
  overflow: visible !important;
}
*, *::before, *::after {
  break-before: auto !important; break-after: auto !important; break-inside: auto !important;
  page-break-before: auto !important; page-break-after: auto !important; page-break-inside: auto !important;
}`;
}
