# OneLongPage PDF

**English** · [Español](README.es.md)

Chrome extension that saves a web page as a **single continuous PDF page**, with no page breaks or cuts. The PDF includes a **header** with the URL and the capture date and time.

> **Reviewing this project?** See [Engineering practices](#engineering-practices) for how it is built: spec-driven development, trunk-based development with pull requests, and CI quality gates that include end-to-end tests against real Chrome.

## Features

- **One single page:** the whole current tab on one page, as tall as the content. Text stays vector (selectable and searchable) and links keep working.
- **Header:** the full URL and the capture date and time at the top of the PDF, in local time with its UTC offset and in UTC (ISO 8601):

  ```
  URL: https://example.com/article?id=123
  Captured: 2026-11-24 14:03:22 UTC-03:00  (2026-11-24T17:03:22Z)
  ```

  The header is drawn in the PDF margin, outside the content, so the page cannot cover or change it with its CSS. The file name also includes the date and time.

- **Hides cookie banners and pop-ups** before capturing and restores them afterwards. It never clicks "accept" or "reject". It also releases the scroll lock those banners set. Turn the option off if you want those elements in the PDF.
- **Keyboard shortcut** (<kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>) and **context menu** (right-click on the page).
- **Languages:** English and Spanish, following Chrome's language.

## Installation (developer mode)

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select the **`extension/`** folder.

## How it works

It uses the Chrome DevTools Protocol (`chrome.debugger` → `Page.printToPDF`):

1. Records the tab's URL and the capture time.
2. If the option is on, hides overlays.
3. Emulates print mode at the chosen paper width and measures the full content height.
4. Generates the PDF on custom-size paper, as tall as the content, with the header in the top margin.
5. If rounding still produces more than one page, retries with a taller page.
6. Restores the page and detaches the debugger.

## Privacy and permissions

The extension **does not connect to any server**: no analytics, no telemetry, no account. The code contains no `fetch`, `XMLHttpRequest` or `WebSocket`. It declares no `host_permissions` and no `content_scripts`.

| Permission     | What it is used for                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `debugger`     | `Page.printToPDF` with a custom paper size and the header. It attaches only to the tab you choose, during the capture, and detaches after. |
| `activeTab`    | Access the current tab only when you click the button, use the shortcut or the menu.                                                       |
| `storage`      | Save your options.                                                                                                                         |
| `downloads`    | Save the PDF to your downloads folder.                                                                                                     |
| `contextMenus` | The right-click menu entry.                                                                                                                |

Chrome shows a strong warning on install because of the `debugger` permission, and a yellow bar while it is in use. No other API lets an extension generate a PDF with an arbitrary page size without the print dialog.

## Known limitations

- It does not work on protected Chrome pages (`chrome://`, Chrome Web Store, the PDF viewer).
- If DevTools is open on the tab, close it before capturing.
- Chrome cannot generate pages taller than about 23 m (65,536 pt). If the content is longer, the extension says so.
- Some viewers, such as Adobe Acrobat, limit pages to about 508 cm (200 inches). Chrome's viewer does not.
- Web apps that scroll their content inside an inner container, or inside a **same-origin** `iframe`, are unrolled automatically. **Cross-origin** `iframe`s cannot be unrolled: only their visible part is captured.
- "Virtualized" lists, which keep only the visible rows in the page (common in huge tables and some chat apps), show only the rows present at that moment.

## Engineering practices

### Workflow

- **Spec-driven development.** Behavior is agreed in writing before code is written. [Spec 001](docs/specs/001-single-page-capture/spec.md) documents the whole product as numbered requirements, with acceptance criteria that each link to the test that verifies them. New work starts from the [spec template](docs/specs/_template.md), and the amount of spec work scales with the size of the change: a test for a bug fix, a spec for new behavior, design and tasks for architectural changes.
- **Trunk-based development with pull requests.** `main` is the only long-lived branch and is always releasable. Changes go through short-lived branches and small PRs, and merge only when CI passes. See [CONTRIBUTING.md](CONTRIBUTING.md).
- **AI-assisted, human-directed.** The project is developed with an AI coding agent (Claude Code) working under a written project constitution, [CLAUDE.md](CLAUDE.md): non-negotiable rules (no network access, least privilege, localized UI, build only what was asked), the workflow above and the code conventions. Every change passes the same review and quality gates.
- **Releases** follow [Semantic Versioning](https://semver.org/), and changes are recorded in [CHANGELOG.md](CHANGELOG.md) following [Keep a Changelog](https://keepachangelog.com/).

### Quality gates

Every pull request runs these checks in [GitHub Actions](.github/workflows/ci.yml):

| Gate             | How                                                                                                                                                                                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lint             | ESLint (flat config): recommended rules plus strict equality, `const`/no `var`, and restricted `console`                                                                                                                                                                                         |
| Formatting       | Prettier and EditorConfig                                                                                                                                                                                                                                                                        |
| Types            | TypeScript in `strict` mode with `checkJs`, over JSDoc-annotated JavaScript (no build step)                                                                                                                                                                                                      |
| Unit tests       | `node:test` on the pure logic: header, options validation, file names, date formatting, PDF page counting, translation parity, self-contained page functions                                                                                                                                     |
| End-to-end tests | The real capture flow driven against **headless Chrome** over the DevTools protocol, on test pages that reproduce real-world layouts (inner scroll containers, iframes, lazy loading, cookie walls). Each test checks that the PDF has one page, the full height, and that the page was restored |

### Design principles

- **Testable core.** The capture flow depends only on a two-method `CdpSession` interface (`send`, `run`), so the exact same code runs inside the extension and in the end-to-end tests against real Chrome. The critical path is not tested against mocks.
- **Regression first.** Bugs are reproduced with a failing test before they are fixed. For example, a web portal that captured only its top part became an end-to-end fixture that failed (805 px of 12,000 captured) until the fix landed.
- **Least privilege and privacy by design.** No network access, no host permissions, no content scripts. The debugger attaches only to the chosen tab, only during the capture.
- **Leave no trace.** Every change made to the page goes through an undo log and is reverted after the capture, also when it fails.
- **Untrusted input is validated.** Stored options and internal messages are validated, message senders are checked, and the URL is HTML-escaped before it goes into the PDF header.
- **Typed errors.** Failures are `CaptureError`s with stable codes, mapped to localized messages.
- **Internationalization and accessibility.** All UI text goes through `chrome.i18n` (English and Spanish, with a test enforcing that both have the same messages). Status updates are announced to screen readers, and focus is always visible.

## Development

Requirements: Node.js 20 or later.

```sh
npm install
npm run check      # lint + formatting + types + unit tests
npm test           # unit tests only (node:test)
npm run test:e2e   # real capture in headless Chrome (set CHROME_PATH if Chrome is not in a standard location)
npm run format     # format the code with Prettier
```

```
extension/                 The extension (the folder you load in Chrome)
  manifest.json
  _locales/{en,es}/        Translated strings (chrome.i18n)
  background/
    service-worker.js      Entry point: messages, shortcut, context menu
    capture.js             Capture flow
    debugger-session.js    chrome.debugger (CDP) wrapper
    page-functions.js      Functions that run inside the page
    capture-header.js      Header with URL and timestamp (pure, tested)
    errors.js              Typed error codes
    …
  shared/                  Options, i18n, messages, date formatting, units
  popup/                   Toolbar popup
  result/                  Preview and download page
tests/                     Unit tests (node:test)
  e2e/                     End-to-end tests against real Chrome, with test pages in fixtures/
docs/specs/                Specifications (template + one folder per spec)
CLAUDE.md                  Project constitution: rules, workflow and conventions
```

The code is JavaScript with ES modules, type-checked by TypeScript (`checkJs` with JSDoc annotations), with no build step: what is in `extension/` is exactly what runs.

Read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting changes and [SECURITY.md](SECURITY.md) to report vulnerabilities.

## Author

**Jose Fuentes** · [LinkedIn](https://www.linkedin.com/in/josefuentes4096/)

## License

[0BSD](LICENSE): use, copy, modify and distribute it for any purpose, with no conditions.
