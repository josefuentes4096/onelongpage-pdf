# Chrome Web Store materials

Everything needed to fill in the Chrome Web Store listing, kept next to the code so it changes with it.

| File                                                               | Dashboard tab                    |
| ------------------------------------------------------------------ | -------------------------------- |
| [listing.en.md](listing.en.md)                                     | Store listing (English)          |
| [listing.es.md](listing.es.md)                                     | Store listing (Spanish)          |
| [privacy.md](privacy.md)                                           | Privacy                          |
| [images/screenshot-1280x800.png](images/screenshot-1280x800.png)   | Store listing → Screenshots      |
| [images/promo-small-440x280.png](images/promo-small-440x280.png)   | Store listing → Small promo tile |
| [`extension/icons/icon128.png`](../../extension/icons/icon128.png) | Store listing → Store icon       |

## Package

The ZIP must have `manifest.json` at its root. Build it from the release tag with `git archive`, which includes only tracked files and writes portable paths:

```sh
git archive --format=zip -o onelongpage-pdf-1.4.0.zip v1.4.0:extension
```

`*.zip` is in `.gitignore`. Each upload needs a `version` higher than the published one.

## Images

Both images are 24-bit PNGs with no alpha channel, as the store requires. They were rendered with headless Chrome from:

- the real popup (`extension/popup/`), with its English strings;
- a real PDF that `capturePdf` produced from a sample article page served as `blog.example.com`.

Regenerate them when the popup or the PDF header changes visibly.

## When to update

- **Permissions change:** update the justifications in [privacy.md](privacy.md), together with the permissions table in both READMEs.
- **Features or limitations change:** update the description in both listings.
- **`extName` or `extDescription` change:** the store takes the name and summary from the package, so update the copies quoted in both listings.
