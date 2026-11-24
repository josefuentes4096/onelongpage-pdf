// @ts-check

/**
 * Functions executed inside the captured page through `CdpSession#run`.
 *
 * IMPORTANT: they are serialized with `Function#toString`, so each one must be
 * fully self-contained: no imports, no references to module-level variables,
 * no shared helpers. Every input arrives as a JSON-serializable argument.
 *
 * Every change to the page is recorded in an undo log (`window[stateKey]`) so
 * `restorePage` can revert it. Log entries are `[element, property, oldValue,
 * oldPriority]`; a property starting with "@" means "attribute added".
 */

/** @returns {{ url: string, title: string, viewportHeight: number }} */
export function getPageInfo() {
  return { url: location.href, title: document.title, viewportHeight: window.innerHeight };
}

/**
 * Hides cookie banners, modals and fixed bars, and releases the scroll lock
 * those banners usually set. Elements are detected structurally (no name
 * lists). Nothing is clicked.
 *
 * @param {string} stateKey Global property holding the undo log.
 * @param {string} hiddenAttr Attribute added to hidden elements.
 * @returns {number} Number of hidden elements.
 */
export function hideOverlays(stateKey, hiddenAttr) {
  /** Fraction of the viewport a sticky element must cover to count as a banner. */
  const STICKY_MIN_COVERAGE = 0.12;
  const STICKY_MIN_Z_INDEX = 100;
  /** Never hide an element holding more than this share of the page text. */
  const MAX_TEXT_SHARE = 0.25;

  const pageGlobals = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (window));
  /** @type {Array<[HTMLElement, string, string, string]>} */
  const log = /** @type {any} */ (pageGlobals[stateKey] ??= []);
  /** @param {HTMLElement} el @param {string} prop @param {string} value */
  const setStyle = (el, prop, value) => {
    log.push([el, prop, el.style.getPropertyValue(prop), el.style.getPropertyPriority(prop)]);
    el.style.setProperty(prop, value, 'important');
  };

  // 1. Release the scroll lock typically set by consent dialogs.
  for (const root of [document.documentElement, document.body]) {
    if (!root) continue;
    const cs = getComputedStyle(root);
    if (/hidden|clip/.test(cs.overflow + cs.overflowY)) setStyle(root, 'overflow', 'visible');
    if (cs.position === 'fixed') {
      setStyle(root, 'position', 'static');
      setStyle(root, 'top', 'auto');
    }
  }

  // 2. Hide overlays.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const viewportArea = vw * vh || 1;
  const totalText = document.body?.innerText.length || 1;
  let hidden = 0;

  for (const el of document.querySelectorAll('body *')) {
    if (!(el instanceof HTMLElement) || el.closest(`[${hiddenAttr}]`)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;

    const pos = cs.position;
    const isModal =
      el.matches('dialog[open], [aria-modal="true"], [role="alertdialog"]') ||
      (el.matches('[role="dialog"]') && (pos === 'fixed' || pos === 'absolute'));
    if (!isModal && pos !== 'fixed' && pos !== 'sticky') continue;

    let hide = isModal || pos === 'fixed';
    if (!hide) {
      // Regular sticky headers print fine (once); only big sticky banners on top go.
      const r = el.getBoundingClientRect();
      const w = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
      const h = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      hide =
        (parseInt(cs.zIndex, 10) || 0) >= STICKY_MIN_Z_INDEX && (w * h) / viewportArea >= STICKY_MIN_COVERAGE;
    }
    // App shells (e.g. a fixed full-screen container holding the content) are kept.
    if (!hide || el.innerText.length / totalText > MAX_TEXT_SHARE) continue;

    setStyle(el, 'display', 'none');
    el.setAttribute(hiddenAttr, '');
    log.push([el, `@${hiddenAttr}`, '', '']);
    hidden++;
  }
  return hidden;
}

/**
 * Marks the inner scroll containers that hold content (common in web apps,
 * where the window itself does not scroll), including those inside
 * same-origin iframes. Must run with the real viewport.
 *
 * @param {string} stateKey Global property holding the undo log.
 * @param {string} markAttr Attribute added to each scroll container.
 * @returns {number} Number of marked containers.
 */
export function markScrollContainers(stateKey, markAttr) {
  /** Ignore containers that overflow by less than this (borders, rounding). */
  const MIN_OVERFLOW_PX = 50;
  /** Ignore narrow containers (sidebars, menus, code blocks). */
  const MIN_WIDTH_SHARE = 0.3;
  const MAX_FRAME_DEPTH = 3;

  const pageGlobals = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (window));
  /** @type {Array<[Element, string, string, string]>} */
  const log = /** @type {any} */ (pageGlobals[stateKey] ??= []);
  let marked = 0;

  /** @param {Document} doc @param {number} depth */
  const visit = (doc, depth) => {
    const win = doc.defaultView;
    if (!win) return;
    const minWidth = win.innerWidth * MIN_WIDTH_SHARE;
    for (const el of doc.querySelectorAll('body, body *')) {
      if (!(el instanceof win.HTMLElement)) continue;
      if (el instanceof win.HTMLIFrameElement) {
        let inner = null;
        try {
          inner = el.contentDocument; // null (or throws) for cross-origin frames
        } catch {
          inner = null;
        }
        if (inner && depth < MAX_FRAME_DEPTH) visit(inner, depth + 1);
        continue;
      }
      if (el.scrollHeight - el.clientHeight < MIN_OVERFLOW_PX || el.clientWidth < minWidth) continue;
      if (el.matches('textarea, select')) continue;
      if (!/^(auto|scroll|overlay)$/.test(win.getComputedStyle(el).overflowY)) continue;
      el.setAttribute(markAttr, '');
      log.push([el, `@${markAttr}`, '', '']);
      marked++;
    }
  };
  visit(document, 0);
  return marked;
}

/**
 * Scrolls the window and every marked scroll container from top to bottom so
 * lazy-loaded content appears, then restores the scroll positions. Repeats
 * while the content keeps growing, within `timeoutMs`. Runs with the real
 * viewport, so the user sees the page scroll.
 *
 * @param {number} timeoutMs
 * @param {string} markAttr Attribute set by `markScrollContainers`.
 * @returns {Promise<void>}
 */
export async function loadLazyContent(timeoutMs, markAttr) {
  const MAX_PASSES = 3;
  const STEP_DELAY_MS = 80;
  const MIN_STEP_PX = 200;
  /** Overlap between steps so nothing is skipped. */
  const STEP_RATIO = 0.9;
  const MAX_FRAME_DEPTH = 3;

  /** @param {number} ms */
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const deadline = Date.now() + timeoutMs;

  /** @type {HTMLElement[]} */
  const containers = [];
  /** @param {Document} doc @param {number} depth */
  const collect = (doc, depth) => {
    doc.querySelectorAll('img[loading="lazy"]').forEach((img) => {
      /** @type {HTMLImageElement} */ (img).loading = 'eager';
    });
    containers.push(.../** @type {NodeListOf<HTMLElement>} */ (doc.querySelectorAll(`[${markAttr}]`)));
    for (const frame of doc.querySelectorAll('iframe')) {
      let inner = null;
      try {
        inner = frame.contentDocument;
      } catch {
        inner = null;
      }
      if (inner && depth < MAX_FRAME_DEPTH) collect(inner, depth + 1);
    }
  };
  collect(document, 0);

  /**
   * @param {() => number} getHeight
   * @param {() => number} getViewport
   * @param {(y: number) => void} scrollTo
   */
  const scrollThrough = async (getHeight, getViewport, scrollTo) => {
    const step = Math.max(MIN_STEP_PX, getViewport() * STEP_RATIO);
    let lastHeight = -1;
    for (let pass = 0; pass < MAX_PASSES && Date.now() < deadline; pass++) {
      if (getHeight() === lastHeight) break;
      lastHeight = getHeight();
      for (let y = 0; y < getHeight() && Date.now() < deadline; y += step) {
        scrollTo(y);
        await sleep(STEP_DELAY_MS);
      }
      scrollTo(getHeight());
      await sleep(STEP_DELAY_MS);
    }
  };

  const startY = window.scrollY;
  await scrollThrough(
    () => document.documentElement.scrollHeight,
    () => window.innerHeight,
    (y) => window.scrollTo(0, y),
  );
  window.scrollTo(0, startY);

  for (const el of containers) {
    const start = el.scrollTop;
    await scrollThrough(
      () => el.scrollHeight,
      () => el.clientHeight,
      (y) => {
        el.scrollTop = y;
      },
    );
    el.scrollTop = start;
  }
}

/**
 * "Unrolls" the marked scroll containers and same-origin iframes so all their
 * content is laid out in the document: the container and its ancestors get
 * `height: auto` and `overflow: visible`, fixed app shells become absolute,
 * and iframes are resized to their content. Run at the final print width.
 *
 * @param {string} stateKey Global property holding the undo log.
 * @param {string} markAttr Attribute set by `markScrollContainers`.
 * @returns {number} Number of unrolled containers and iframes.
 */
export function expandScrollContainers(stateKey, markAttr) {
  const MIN_OVERFLOW_PX = 50;
  const MIN_WIDTH_SHARE = 0.3;
  const MAX_FRAME_DEPTH = 3;

  const pageGlobals = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (window));
  /** @type {Array<[HTMLElement, string, string, string]>} */
  const log = /** @type {any} */ (pageGlobals[stateKey] ??= []);
  /** @param {HTMLElement} el @param {string} prop @param {string} value */
  const setStyle = (el, prop, value) => {
    log.push([el, prop, el.style.getPropertyValue(prop), el.style.getPropertyPriority(prop)]);
    el.style.setProperty(prop, value, 'important');
  };

  /**
   * Removes height constraints from `el` and all its ancestors.
   * @param {HTMLElement} el
   * @param {Window} win
   */
  const unlock = (el, win) => {
    for (let node = /** @type {HTMLElement | null} */ (el); node; node = node.parentElement) {
      const cs = win.getComputedStyle(node);
      if (cs.overflowY !== 'visible' || cs.overflowX !== 'visible') setStyle(node, 'overflow', 'visible');
      setStyle(node, 'height', 'auto');
      setStyle(node, 'max-height', 'none');
      if (cs.position === 'fixed') setStyle(node, 'position', 'absolute');
      if (cs.position === 'fixed' || cs.position === 'absolute') setStyle(node, 'bottom', 'auto');
      const parent = node.parentElement;
      if (parent) {
        const pcs = win.getComputedStyle(parent);
        if (pcs.display.includes('flex') && pcs.flexDirection.startsWith('column')) {
          // In a column flexbox, let the item grow to its content instead of shrinking.
          setStyle(node, 'flex-shrink', '0');
          setStyle(node, 'flex-basis', 'auto');
        }
      }
    }
  };

  let expanded = 0;
  /** @param {Document} doc @param {number} depth */
  const visit = (doc, depth) => {
    const win = doc.defaultView;
    if (!win) return;

    // Innermost documents first: an iframe's size depends on its content.
    for (const frame of doc.querySelectorAll('iframe')) {
      let inner = null;
      try {
        inner = frame.contentDocument;
      } catch {
        inner = null;
      }
      if (!inner?.documentElement || depth >= MAX_FRAME_DEPTH) continue;
      visit(inner, depth + 1);
      unlock(inner.documentElement, /** @type {Window} */ (inner.defaultView));
      if (inner.body) unlock(inner.body, /** @type {Window} */ (inner.defaultView));
      const contentHeight = Math.max(inner.documentElement.scrollHeight, inner.body?.scrollHeight ?? 0);
      if (
        frame.clientWidth >= win.innerWidth * MIN_WIDTH_SHARE &&
        contentHeight > frame.clientHeight + MIN_OVERFLOW_PX
      ) {
        unlock(frame, win);
        setStyle(frame, 'height', `${contentHeight}px`);
        expanded++;
      }
    }

    for (const el of doc.querySelectorAll(`[${markAttr}]`)) {
      unlock(/** @type {HTMLElement} */ (el), win);
      expanded++;
    }
  };
  visit(document, 0);
  return expanded;
}

/**
 * Inserts (or replaces) a `<style>` element with the given id.
 *
 * @param {string} styleId
 * @param {string} css
 */
export function injectStyle(styleId, css) {
  let style = document.getElementById(styleId);
  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    document.documentElement.appendChild(style);
  }
  style.textContent = css;
}

/**
 * Waits until web fonts and pending images have loaded, at most `timeoutMs`.
 *
 * @param {number} timeoutMs
 * @returns {Promise<void>}
 */
export async function waitForResources(timeoutMs) {
  const pendingImages = [...document.images]
    .filter((img) => !img.complete)
    .map(
      (img) =>
        new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        }),
    );
  await Promise.race([
    Promise.all([document.fonts?.ready, ...pendingImages]),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

/** @returns {number} Full document height in CSS pixels. */
export function measureContentHeight() {
  const doc = document.documentElement;
  const body = document.body;
  return Math.ceil(
    Math.max(
      doc.scrollHeight,
      doc.offsetHeight,
      doc.getBoundingClientRect().height,
      body?.scrollHeight ?? 0,
      body?.offsetHeight ?? 0,
    ),
  );
}

/**
 * Undoes every change recorded in the undo log and removes the injected style.
 *
 * @param {string} stateKey
 * @param {string} styleId
 */
export function restorePage(stateKey, styleId) {
  document.getElementById(styleId)?.remove();

  const pageGlobals = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (window));
  /** @type {Array<[HTMLElement, string, string, string]>} */
  const log = /** @type {any} */ (pageGlobals[stateKey] ?? []);
  for (let i = log.length - 1; i >= 0; i--) {
    const [el, prop, value, priority] = log[i];
    if (prop.startsWith('@')) el.removeAttribute(prop.slice(1));
    else if (value) el.style.setProperty(prop, value, priority);
    else el.style.removeProperty(prop);
  }
  delete pageGlobals[stateKey];
}
