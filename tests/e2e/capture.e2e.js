// End-to-end tests: run the extension's real capture flow against headless
// Chrome. Run with `npm run test:e2e` (needs Chrome; set CHROME_PATH if it is
// not in a standard location).
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { capturePdf, restoreAfterCapture } from '../../extension/background/capture.js';
import { DEFAULT_OPTIONS } from '../../extension/shared/options.js';
import { PX_PER_IN } from '../../extension/shared/units.js';
import { launchChrome, openPage, serveDirectory } from './chrome.js';

const ROWS = 300;
const ROW_HEIGHT_PX = 40;
const EXPECTED_CONTENT_PX = ROWS * ROW_HEIGHT_PX;
/** Header, margins and slack on top of the rows; anything beyond means runaway growth. */
const MAX_EXTRA_RATIO = 1.25;
const LABELS = { url: 'URL', captured: 'Captured' };

const FIXTURES = [
  ['plain', 'a normal long page'],
  ['inner-scroll', 'a web app with an inner scroll container'],
  ['iframe', 'content in a fixed-height same-origin iframe'],
  ['iframe-inner-scroll', 'an iframe whose document has an inner scroll container'],
  ['lazy-window', 'content loaded while scrolling the window'],
  ['lazy-inner', 'content loaded while scrolling an inner container'],
  ['consent', 'a cookie dialog that locks scrolling'],
];

describe('capturePdf in real Chrome', { timeout: 180_000 }, () => {
  let chrome;
  let server;

  before(async () => {
    server = await serveDirectory(fileURLToPath(new URL('./fixtures/', import.meta.url)));
    chrome = await launchChrome();
  });

  after(async () => {
    await chrome?.close();
    await server?.close();
  });

  for (const [fixture, description] of FIXTURES) {
    it(`captures the whole content of ${description}`, async () => {
      const page = await openPage(chrome.browser, `${server.baseUrl}/${fixture}.html`);
      try {
        let result;
        try {
          result = await capturePdf(page, DEFAULT_OPTIONS, LABELS);
        } finally {
          await restoreAfterCapture(page);
        }

        const paperHeightPx = Math.round(result.paperHeightIn * PX_PER_IN);
        assert.equal(result.pages, 1, `${fixture}: expected 1 page, got ${result.pages}`);
        assert.ok(
          paperHeightPx >= EXPECTED_CONTENT_PX,
          `${fixture}: page is ${paperHeightPx}px, content is ${EXPECTED_CONTENT_PX}px (truncated)`,
        );
        assert.ok(
          paperHeightPx <= EXPECTED_CONTENT_PX * MAX_EXTRA_RATIO,
          `${fixture}: page is ${paperHeightPx}px, far more than ${EXPECTED_CONTENT_PX}px`,
        );

        const leftovers = await page.run(
          () =>
            document.querySelectorAll(
              '[data-onelongpage-scroller], [data-onelongpage-hidden], #__onelongpage_print_css',
            ).length,
        );
        assert.equal(leftovers, 0, `${fixture}: page was not restored`);
      } finally {
        await page.close();
      }
    });
  }
});
