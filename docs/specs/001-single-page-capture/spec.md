# 001 — Single-page PDF capture

| Field   | Value                                                                       |
| ------- | --------------------------------------------------------------------------- |
| Status  | Implemented (retroactive spec: it documents the behavior already built)     |
| Version | 1.3.0 plus the unreleased changes in `CHANGELOG.md`                         |
| Related | `extension/background/capture.js`, `page-functions.js`, `capture-header.js` |

## Context

Printing a long web page to PDF splits it into many pages, cutting text and images at page boundaries. Users want the **whole page as one continuous PDF page**, with real (selectable, searchable) text and working links, without the print dialog. Many modern sites make this harder: content scrolls inside inner containers or iframes, loads only while scrolling, or is covered by cookie dialogs that also lock scrolling.

## Goals

- Capture the full content of the current tab as **one PDF page** as tall as the content.
- Keep the PDF vector: selectable text and clickable links.
- Show a header with the full URL and the capture date and time.
- Work on web apps whose content scrolls inside inner containers or same-origin iframes.
- Leave the page exactly as it was after the capture.
- Process everything locally, with no network access.

## Non-goals

- Multi-page output, or splitting the content into standard paper sizes.
- Capturing a text selection, or editing or pasting text (removed in 1.2.0).
- Unrolling **cross-origin** iframes (the page has no access to their content).
- Rendering every row of "virtualized" lists (only rows present in the DOM are captured).
- Digital signatures or timestamps from external authorities.
- Any network request, upload or account.

## Behavior

### Triggers

- **R1.** The capture can be started from the toolbar popup ("Capture this page"), with the keyboard shortcut `Alt+Shift+P` (user-configurable at `chrome://extensions/shortcuts`), or from the page context menu ("Save page as a single-page PDF").
- **R2.** Only one capture can run per tab at a time. A second request on the same tab fails with the "already running" error.

### Options

- **R3.** The extension shall offer these options, stored in `chrome.storage.sync` and validated on every read and write (invalid values fall back to the default):

  | Option            | Values                                             | Default |
  | ----------------- | -------------------------------------------------- | ------- |
  | Paper width       | 210 (A4), 216 (Letter), 297 (A3), 148 (A5), 100 mm | 210 mm  |
  | Margin            | 0–50 mm, whole numbers                             | 10 mm   |
  | Backgrounds       | on / off                                           | on      |
  | Load lazy content | on / off                                           | on      |
  | Hide overlays     | on / off                                           | on      |
  | Ask where to save | on / off                                           | off     |

### Capture

- **R4.** When a capture starts, the extension shall record the tab's URL and the capture time **before** changing anything in the page.
- **R5.** When "Hide overlays" is on, the extension shall, with the real viewport:
  - release the scroll lock on `html`/`body` (`overflow: hidden`/`clip`, `position: fixed`);
  - hide modal dialogs (`dialog[open]`, `[aria-modal="true"]`, `[role="alertdialog"]`, and `[role="dialog"]` when fixed or absolute), fixed elements, and sticky elements with `z-index` ≥ 100 covering ≥ 12% of the viewport;
  - never hide an element holding more than 25% of the page text (protects app shells that contain the content);
  - never click anything.
- **R6.** The extension shall detect inner scroll containers (including the `body`) that overflow their box by ≥ 50 px, are at least 30% of the viewport wide and have `overflow-y` `auto`, `scroll` or `overlay`. It searches the page and same-origin iframes up to 3 levels deep, and skips `textarea` and `select`.
- **R7.** When "Load lazy content" is on, the extension shall scroll the window and then each detected container from top to bottom with the real viewport, in steps of 90% of the visible height, repeating (up to 3 passes) while the content keeps growing, for at most 20 s in total. It then restores the original scroll positions. Images with `loading="lazy"` are switched to eager.
- **R8.** The extension shall emulate print media with a viewport as wide as the paper minus the margins and as tall as the real viewport (minimum 300 px).
- **R9.** The extension shall unroll the detected containers and their ancestors (`height: auto`, `max-height: none`, `overflow: visible`; fixed ancestors become absolute; column-flexbox items grow to their content), and resize same-origin iframes to their content height, innermost first.
- **R10.** The extension shall inject print CSS that removes forced page breaks and sets the page margins, wait for web fonts and pending images (at most 3 s), and measure the full document height.
- **R11.** The extension shall generate the PDF with `Page.printToPDF` on paper exactly as tall as the content plus margins plus 0.15 in. If the result has more than one page, it retries with a taller page (up to 4 attempts in total).
- **R12.** If the required height exceeds 900 in (~22.9 m, below Chromium's 65,536 pt page limit), the capture fails with the "too tall" error and suggests a wider paper.
- **R13.** After the capture, whether it succeeded or failed, the extension shall undo every change it made to the page (styles, attributes, injected CSS, emulation) and detach the debugger.

### Header

- **R14.** The PDF shall show, in the top margin and outside the page content, the full URL (wrapped, never truncated) and the capture time in local time with its UTC offset and in UTC ISO 8601 (for example `2026-11-24 14:03:22 UTC-03:00 (2026-11-24T17:03:22Z)`). Labels are localized. The top margin grows to fit long URLs.
- **R15.** The URL and labels shall be HTML-escaped so the page cannot inject markup into the header.

### Output

- **R16.** The file name shall be `<title> <YYYY-MM-DD_HHMMSS>.pdf`, using the page title with characters invalid on Windows, macOS or Linux removed, at most 120 characters, and `document` when empty.
- **R17.** When the PDF is ready, the extension shall open a result page that previews it, downloads it automatically ("Save as" dialog if that option is on), and offers a download button. The result is kept in memory for at most 2 minutes if the result page does not collect it.
- **R18.** Progress and errors shall be shown in the popup when it is open, and always on the toolbar icon ("…" while working, a red "!" with the message in the tooltip for 15 s on error).

### Errors

- **R19.** Errors shown to the user: protected page (`chrome://`, Web Store, PDF viewer), DevTools open on the tab, capture already running, capture canceled (debugger infobar closed), tab not found, content too tall, page could not be prepared, unexpected error.

### Localization and privacy

- **R20.** All UI text is available in English (default) and Spanish, following Chrome's language.
- **R21.** The extension makes no network requests and uses only the `debugger`, `activeTab`, `storage`, `downloads` and `contextMenus` permissions.

## Acceptance criteria

| ID   | Criterion                                                                                              | Verified by                                                                                                                                |
| ---- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| AC1  | A normal long page is captured whole on one page                                                       | `tests/e2e/fixtures/plain.html`                                                                                                            |
| AC2  | A web app with a fixed shell and an inner scroll container is captured whole (R6, R9)                  | `tests/e2e/fixtures/inner-scroll.html`                                                                                                     |
| AC3  | Content in a fixed-height same-origin iframe is captured whole (R9)                                    | `tests/e2e/fixtures/iframe.html`                                                                                                           |
| AC4  | An iframe whose document has an inner scroll container is captured whole (R6, R9)                      | `tests/e2e/fixtures/iframe-inner-scroll.html`                                                                                              |
| AC5  | Content loaded while scrolling the window is included (R7)                                             | `tests/e2e/fixtures/lazy-window.html`                                                                                                      |
| AC6  | Content loaded while scrolling an inner container is included (R7)                                     | `tests/e2e/fixtures/lazy-inner.html`                                                                                                       |
| AC7  | A cookie dialog that locks scrolling does not truncate the capture (R5)                                | `tests/e2e/fixtures/consent.html`                                                                                                          |
| AC8  | The output has exactly one page and is not much taller than the content (R11)                          | all e2e fixtures (page count and ≤ 125% height check)                                                                                      |
| AC9  | No marker attribute or injected style remains after the capture (R13)                                  | all e2e fixtures (restore check)                                                                                                           |
| AC10 | The header contains the full URL and UTC time, escapes markup, and grows with the URL (R14, R15)       | `tests/capture-header.test.js`                                                                                                             |
| AC11 | Options are validated and fall back to defaults (R3)                                                   | `tests/options.test.js`                                                                                                                    |
| AC12 | File names are safe on all platforms (R16)                                                             | `tests/pdf-utils.test.js`, `tests/time.test.js`                                                                                            |
| AC13 | Print CSS sets margins and removes forced page breaks (R10)                                            | `tests/print-styles.test.js`                                                                                                               |
| AC14 | English and Spanish have the same messages and placeholders (R20)                                      | `tests/locales.test.js`                                                                                                                    |
| AC15 | Page functions are self-contained (constraint)                                                         | `tests/page-functions.test.js`                                                                                                             |
| AC16 | Triggers, result page, download, badge and error messages work in the real extension (R1, R2, R17–R19) | manual: load `extension/`, capture from popup, shortcut and context menu; repeat a capture while one is running; open DevTools and capture |

## Constraints

- Manifest V3, Chrome 116 or later. Uses `chrome.debugger` (CDP protocol 1.3) because it is the only API that lets an extension print a PDF with an arbitrary page size without the print dialog. Chrome shows a warning on install and a yellow bar during capture.
- Chromium refuses pages taller than 65,536 pt. Some viewers (such as Adobe Acrobat) limit pages to 200 in.
- Rules from `CLAUDE.md`: no network, minimal permissions, localized text, self-contained page functions, page always restored.

## Known limitations

- If the user closes the debugger infobar during a capture, the connection is lost before the page can be restored. Overlays stay hidden and containers stay unrolled until the page is reloaded.
- Cross-origin iframes and virtualized lists: see Non-goals.
- Pages that re-render on resize may undo the unrolling before the measurement.
- `vh`-based layouts are measured at the real viewport height; Chrome may lay them out differently on the very tall print page, which is absorbed by the retry in R11.

## Open questions

- Should the page be restored after the user cancels the infobar (for example by reattaching, which shows the infobar again)?

## Decision log

- 2026-11-24 — Use `Page.printToPDF` through `chrome.debugger` instead of screenshots, to keep vector text and links.
- 2026-11-24 — Header (URL + date/time) drawn with `headerTemplate` in the page margin, so page CSS cannot hide it.
- 2026-11-24 — Removed the text editor and selection capture: out of scope.
- 2026-11-24 — Detect and unroll inner scroll containers and same-origin iframes, after a real portal captured only ~7–10% of its content.
- 2026-11-24 — Lazy loading runs with the real viewport, before print emulation (previously used a 100 px viewport and skipped content).
