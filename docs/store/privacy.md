# Privacy practices

Answers for the **Privacy** tab of the Chrome Web Store developer dashboard. This tab has one language, so the answers are in English. Keep them in line with the permissions table in both READMEs.

## Single purpose

```text
Save the current web page as a single continuous PDF page, with a header showing the page URL and the capture date and time.
```

## Permission justifications

### `debugger`

```text
Used to call the Chrome DevTools Protocol method Page.printToPDF on the tab the user chooses to capture. It is the only extension API that can print a page to PDF with a custom paper size, which the extension needs to make one PDF page as tall as the whole content, and to add a header with the URL and capture time. The debugger attaches only to that tab, only after a user action (toolbar button, keyboard shortcut or context menu), and detaches as soon as the capture ends. During the capture it temporarily hides cookie banners, expands inner scroll areas and emulates print media; every change is reverted afterwards. It does not read or send page data anywhere.
```

### `activeTab`

```text
Gives temporary access to the tab the user is viewing when they click the toolbar button, press the keyboard shortcut or use the context menu, so the extension can capture that tab and only that tab. The extension requests no host permissions.
```

### `downloads`

```text
Saves the generated PDF to the user's downloads folder, optionally with the Save As dialog when the user turns on "Ask where to save".
```

### `storage`

```text
Stores the user's capture options (paper width, margin, backgrounds, lazy loading, hiding overlays, Save As) with chrome.storage.sync. No page content or browsing data is stored.
```

### `contextMenus`

```text
Adds a "Save page as a single-page PDF" entry to the page's right-click menu, as an alternative way to start a capture.
```

## Remote code

**No, I am not using remote code.** All JavaScript is in the package. The extension makes no network requests and declares no `host_permissions` and no `content_scripts`.

## Data usage

Leave every data type **unchecked**: the extension does not collect or transmit any user data. The page content and the PDF stay on the user's computer.

Check the three certifications:

- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

## Privacy policy URL

```text
https://github.com/josefuentes4096/onelongpage-pdf#privacy-and-permissions
```

The README section states that the extension connects to no server and lists what each permission is used for.
