# OneLongPage PDF: project constitution

Chrome extension (Manifest V3) that saves the current web page as **one continuous PDF page**, with a header showing the URL and the capture date and time. The product is described in [docs/specs/001-single-page-capture/spec.md](docs/specs/001-single-page-capture/spec.md), which is the source of truth for behavior.

## Non-negotiable rules

1. **Build only what was asked.** Do not add features, options or files beyond the request. List possible extras at the end of your answer as suggestions, and wait for a yes before you build them.
2. **No network access.** The extension must not contact any server: no `fetch`, `XMLHttpRequest`, `WebSocket` or remote resources in `extension/`. Any exception must be opt-in, off by default, and documented in both READMEs.
3. **Minimal permissions.** Do not add permissions, `host_permissions` or `content_scripts` without justifying it in the PR and in the permissions table in both READMEs.
4. **All UI text is localized.** Every visible string lives in `extension/_locales/{en,es}/messages.json`, with the same keys in both files. `tests/locales.test.js` enforces this.
5. **Page functions are self-contained.** Everything in `extension/background/page-functions.js` is serialized with `Function#toString` and run inside the page: no imports and no references to module-level names. Every page change must go through the undo log so that `restorePage` can revert it. `tests/page-functions.test.js` enforces the first part.
6. **Never leave the page modified.** Every capture path must end in `restoreAfterCapture`, including when it fails.

## Workflow

- **Trunk-based development with PRs.** `main` is the only long-lived branch. Work on a short-lived branch (`fix/…`, `feat/…`, `docs/…`) and merge through a PR once CI passes. Never commit to `main` directly. See [CONTRIBUTING.md](CONTRIBUTING.md).
- **Spec-driven, sized to the change:**

  | Change                                   | Required spec work                                                                                                           |
  | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
  | Bug fix that restores specified behavior | PR description + a test that reproduces the bug                                                                              |
  | New or changed behavior                  | New spec in `docs/specs/NNN-short-name/spec.md` from `_template.md`, or an update to an existing one, agreed **before** code |
  | Architectural change                     | Spec plus its "Design" and "Tasks" sections filled in                                                                        |

  The spec goes in the same PR as the code. When behavior changes, update spec 001 (or the relevant spec) in that PR so the spec keeps matching the product.

- **Acceptance criteria become tests.** Each criterion links to the unit test (`tests/`) or end-to-end fixture (`tests/e2e/fixtures/`) that verifies it.
- Update `CHANGELOG.md` under "Sin publicar" for user-visible changes.
- Commit messages: imperative mood, in English (`Fix header height for long URLs`).

## Commands

```sh
npm run check      # lint + format check + type check + unit tests (must pass)
npm run test:e2e   # real capture in headless Chrome (must pass for capture changes)
npm run format     # Prettier
```

## Code conventions

- Plain JavaScript with ES modules, `// @ts-check` and JSDoc types, checked by `tsc` (`jsconfig.json`). No build step: `extension/` is exactly what ships.
- Pure logic (formatting, header, options, PDF utilities) lives in modules without `chrome.*` calls at import time, so Node tests can import them.
- `capturePdf(session, …)` only depends on the `CdpSession` interface (`send`, `run`). Keep it that way: the e2e tests drive it against real Chrome.
- Errors: throw `CaptureError` with an `ErrorCode`. The code is also the i18n key of the user-facing message.
- Name constants instead of using magic numbers. Document why, not what.

## Documentation

- `README.md` (English) and `README.es.md` (Spanish) must stay in sync.
- Specs and code comments are in English.
