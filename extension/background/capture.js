// @ts-check
import { t } from '../shared/i18n.js';
import { formatFileTimestamp } from '../shared/time.js';
import { MAX_PAPER_HEIGHT_IN, MM_PER_IN, PX_PER_IN, mmToIn } from '../shared/units.js';
import { DebuggerSession } from './debugger-session.js';
import { CaptureError, ErrorCode, toCaptureError } from './errors.js';
import { buildCaptureHeader } from './capture-header.js';
import {
  expandScrollContainers,
  getPageInfo,
  hideOverlays,
  injectStyle,
  loadLazyContent,
  markScrollContainers,
  measureContentHeight,
  restorePage,
  waitForResources,
} from './page-functions.js';
import { countPdfPages, sanitizeFilename } from './pdf-utils.js';
import { buildPrintCss } from './print-styles.js';
import { putResult } from './result-store.js';

/** @typedef {import('../shared/options.js').CaptureOptions} CaptureOptions */
/** @typedef {import('./debugger-session.js').CdpSession} CdpSession */

/**
 * @typedef {object} PdfCapture
 * @property {string} data PDF bytes, base64-encoded.
 * @property {number} paperHeightIn
 * @property {number} pages Pages in the final PDF (1 unless every retry failed).
 * @property {string} url
 * @property {string} title
 * @property {Date} capturedAt
 */

// Identifiers shared with the page functions (passed as arguments).
const PAGE_STATE_KEY = '__oneLongPageUndoLog';
const PAGE_HIDDEN_ATTR = 'data-onelongpage-hidden';
const PAGE_SCROLLER_ATTR = 'data-onelongpage-scroller';
const PAGE_STYLE_ID = '__onelongpage_print_css';

const MIN_CONTENT_WIDTH_PX = 200;
const MIN_VIEWPORT_HEIGHT_PX = 300;
const LAZY_LOAD_TIMEOUT_MS = 20_000;
const RESOURCE_TIMEOUT_MS = 3_000;
/** Extra height added to the measured content to absorb rounding. */
const HEIGHT_SLACK_IN = 0.15;
const MAX_PRINT_ATTEMPTS = 4;

/** Tabs with a capture in progress (one capture per tab at a time). */
const activeTabs = new Set();

/**
 * Captures a tab as a single-page PDF and opens the result page.
 *
 * @param {number} tabId
 * @param {CaptureOptions} options
 * @returns {Promise<{ paperHeightIn: number }>}
 * @throws {CaptureError}
 */
export async function captureTab(tabId, options) {
  if (activeTabs.has(tabId)) throw new CaptureError(ErrorCode.BUSY);
  activeTabs.add(tabId);
  const session = new DebuggerSession(tabId);
  try {
    await session.attach();
    const capture = await capturePdf(session, options, {
      url: t('headerUrl'),
      captured: t('headerCaptured'),
    });
    const id = putResult({
      data: capture.data,
      filename: `${sanitizeFilename(capture.title)} ${formatFileTimestamp(capture.capturedAt)}.pdf`,
      saveAs: options.saveAs,
      paperHeightIn: capture.paperHeightIn,
      url: capture.url,
      capturedAt: capture.capturedAt.toISOString(),
    });
    await chrome.tabs.create({
      url: chrome.runtime.getURL(`result/result.html?id=${encodeURIComponent(id)}`),
    });
    return { paperHeightIn: capture.paperHeightIn };
  } catch (error) {
    if (session.canceledByUser) throw new CaptureError(ErrorCode.CANCELED, [], { cause: error });
    throw toCaptureError(error);
  } finally {
    await restoreAfterCapture(session);
    await session.detach();
    activeTabs.delete(tabId);
  }
}

/**
 * Produces the single-page PDF. Independent of the extension APIs so it can
 * be exercised against a real browser in end-to-end tests. Always call
 * `restoreAfterCapture` afterwards, also on failure.
 *
 * @param {CdpSession} session
 * @param {CaptureOptions} options
 * @param {{ url: string, captured: string }} labels Localized header labels.
 * @returns {Promise<PdfCapture>}
 */
export async function capturePdf(session, options, labels) {
  const paperWidthIn = mmToIn(options.paperWidthMm);
  const marginIn = mmToIn(options.marginMm);
  const contentWidthPx = Math.max(
    MIN_CONTENT_WIDTH_PX,
    Math.round((paperWidthIn - 2 * marginIn) * PX_PER_IN),
  );

  // Record what is being captured and when, before touching the page.
  const { url, title, viewportHeight } = await session.run(getPageInfo);
  const capturedAt = new Date();

  const header = buildCaptureHeader({ url, capturedAt, paperWidthIn, marginIn, labels });
  const marginTopIn = Math.max(marginIn, header.heightIn);

  // Steps that depend on the real layout run before any emulation:
  // overlays are detected by how they cover the screen, scroll containers by
  // overflowing their box, and lazy content loads as the user would see it.
  if (options.hideOverlays) await session.run(hideOverlays, PAGE_STATE_KEY, PAGE_HIDDEN_ATTR);
  await session.run(markScrollContainers, PAGE_STATE_KEY, PAGE_SCROLLER_ATTR);
  if (options.loadLazy) await session.run(loadLazyContent, LAZY_LOAD_TIMEOUT_MS, PAGE_SCROLLER_ATTR);

  // Lay the page out as it will be printed, at the final paper width. The
  // viewport keeps its real height so `vh`-based layouts don't collapse.
  await session.send('Emulation.setEmulatedMedia', { media: 'print' });
  await session.send('Emulation.setDeviceMetricsOverride', {
    width: contentWidthPx,
    height: Math.max(MIN_VIEWPORT_HEIGHT_PX, viewportHeight),
    deviceScaleFactor: 1,
    mobile: false,
  });
  await session.run(injectStyle, PAGE_STYLE_ID, buildPrintCss(marginTopIn, marginIn));
  await session.run(expandScrollContainers, PAGE_STATE_KEY, PAGE_SCROLLER_ATTR);
  await session.run(waitForResources, RESOURCE_TIMEOUT_MS);
  const contentHeightPx = await session.run(measureContentHeight);

  const { data, paperHeightIn, pages } = await printSinglePage(session, {
    paperWidthIn,
    marginIn,
    marginTopIn,
    contentHeightPx,
    printBackground: options.background,
    headerTemplate: header.html,
  });

  return { data, paperHeightIn, pages, url, title, capturedAt };
}

/**
 * Prints with a paper height equal to the content height. If rounding still
 * spills onto extra pages, retries with a taller page.
 *
 * @param {CdpSession} session
 * @param {object} p
 * @param {number} p.paperWidthIn
 * @param {number} p.marginIn
 * @param {number} p.marginTopIn
 * @param {number} p.contentHeightPx
 * @param {boolean} p.printBackground
 * @param {string} p.headerTemplate
 * @returns {Promise<{ data: string, paperHeightIn: number, pages: number }>}
 */
async function printSinglePage(session, p) {
  let paperHeightIn = p.contentHeightPx / PX_PER_IN + p.marginTopIn + p.marginIn + HEIGHT_SLACK_IN;
  assertPrintableHeight(paperHeightIn);

  let data = '';
  let pages = 0;
  for (let attempt = 1; attempt <= MAX_PRINT_ATTEMPTS; attempt++) {
    /** @type {{ data: string }} */
    const response = await session.send('Page.printToPDF', {
      paperWidth: p.paperWidthIn,
      paperHeight: paperHeightIn,
      marginTop: p.marginTopIn,
      marginBottom: p.marginIn,
      marginLeft: p.marginIn,
      marginRight: p.marginIn,
      printBackground: p.printBackground,
      preferCSSPageSize: false,
      scale: 1,
      displayHeaderFooter: true,
      headerTemplate: p.headerTemplate,
      footerTemplate: '<span></span>',
    });
    data = response.data;

    pages = countPdfPages(data);
    if (pages <= 1) break;
    if (attempt === MAX_PRINT_ATTEMPTS) {
      console.warn(`[capture] still ${pages} pages after ${attempt} attempts; keeping last result`);
      break;
    }
    // Grow proportionally to the overflow, plus a small fixed margin.
    paperHeightIn *= 1 + 0.03 * (pages - 1) + 0.02;
    assertPrintableHeight(paperHeightIn);
  }
  return { data, paperHeightIn, pages };
}

/** @param {number} paperHeightIn */
function assertPrintableHeight(paperHeightIn) {
  if (paperHeightIn > MAX_PAPER_HEIGHT_IN) {
    const meters = ((paperHeightIn * MM_PER_IN) / 1000).toFixed(1);
    throw new CaptureError(ErrorCode.TOO_TALL, [meters]);
  }
}

/**
 * Restores the page. Each step is independent: a failure in one must not
 * prevent the others (the tab may also have been closed).
 *
 * @param {CdpSession} session
 */
export async function restoreAfterCapture(session) {
  const steps = [
    () => session.run(restorePage, PAGE_STATE_KEY, PAGE_STYLE_ID),
    () => session.send('Emulation.clearDeviceMetricsOverride'),
    () => session.send('Emulation.setEmulatedMedia', { media: '' }),
  ];
  for (const step of steps) {
    try {
      await step();
    } catch (error) {
      console.debug('[capture] restore step failed', error);
    }
  }
}
