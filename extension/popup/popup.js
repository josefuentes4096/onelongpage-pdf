// @ts-check
import { localizeDocument, t } from '../shared/i18n.js';
import { MessageType } from '../shared/messages.js';
import { loadOptions, saveOptions } from '../shared/options.js';
import { CM_PER_IN } from '../shared/units.js';

/** @typedef {import('../shared/options.js').CaptureOptions} CaptureOptions */
/** @typedef {import('../shared/messages.js').CaptureResponse} CaptureResponse */

const COMMAND_CAPTURE = 'capture-page';
const SHORTCUTS_URL = 'chrome://extensions/shortcuts';

/**
 * @template {HTMLElement} T
 * @param {string} id
 * @returns {T}
 */
function byId(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return /** @type {T} */ (el);
}

const ui = {
  capture: /** @type {HTMLButtonElement} */ (byId('capture')),
  status: byId('status'),
  shortcut: byId('shortcut'),
  changeShortcut: byId('changeShortcut'),
  paperWidthMm: /** @type {HTMLSelectElement} */ (byId('paperWidthMm')),
  marginMm: /** @type {HTMLInputElement} */ (byId('marginMm')),
  background: /** @type {HTMLInputElement} */ (byId('background')),
  loadLazy: /** @type {HTMLInputElement} */ (byId('loadLazy')),
  hideOverlays: /** @type {HTMLInputElement} */ (byId('hideOverlays')),
  saveAs: /** @type {HTMLInputElement} */ (byId('saveAs')),
};

/** @returns {CaptureOptions} */
function readForm() {
  return {
    paperWidthMm: Number(ui.paperWidthMm.value),
    marginMm: Number(ui.marginMm.value),
    background: ui.background.checked,
    loadLazy: ui.loadLazy.checked,
    hideOverlays: ui.hideOverlays.checked,
    saveAs: ui.saveAs.checked,
  };
}

/** @param {CaptureOptions} options */
function fillForm(options) {
  ui.paperWidthMm.value = String(options.paperWidthMm);
  ui.marginMm.value = String(options.marginMm);
  ui.background.checked = options.background;
  ui.loadLazy.checked = options.loadLazy;
  ui.hideOverlays.checked = options.hideOverlays;
  ui.saveAs.checked = options.saveAs;
}

/**
 * @param {string} text
 * @param {{ error?: boolean }} [opts]
 */
function setStatus(text, { error = false } = {}) {
  ui.status.textContent = text;
  ui.status.classList.toggle('error', error);
}

async function onCapture() {
  ui.capture.disabled = true;
  setStatus(t('statusWorking'));
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    /** @type {CaptureResponse} */
    const response = await chrome.runtime.sendMessage({
      type: MessageType.CAPTURE_TAB,
      tabId: tab?.id,
      options: readForm(),
    });
    if (response.ok) {
      setStatus(t('statusDone', String(Math.round(response.paperHeightIn * CM_PER_IN))));
    } else {
      setStatus(response.error, { error: true });
    }
  } catch (error) {
    setStatus(t('errorUnknown', String(error)), { error: true });
  } finally {
    ui.capture.disabled = false;
  }
}

/** Shows the shortcut actually assigned (users can change it). */
async function renderShortcut() {
  const commands = await chrome.commands.getAll();
  const shortcut = commands.find((c) => c.name === COMMAND_CAPTURE)?.shortcut;
  /** @type {(string | Node)[]} */
  const nodes = [`${t('popupShortcutLabel')} `];
  if (!shortcut) {
    nodes.push(t('popupShortcutUnassigned'));
  } else {
    shortcut.split('+').forEach((key, i) => {
      if (i > 0) nodes.push('+');
      const kbd = document.createElement('kbd');
      kbd.textContent = key;
      nodes.push(kbd);
    });
  }
  ui.shortcut.replaceChildren(...nodes);
}

async function init() {
  localizeDocument();
  fillForm(await loadOptions());

  for (const input of [
    ui.paperWidthMm,
    ui.marginMm,
    ui.background,
    ui.loadLazy,
    ui.hideOverlays,
    ui.saveAs,
  ]) {
    input.addEventListener('change', () => {
      saveOptions(readForm()).catch((error) => console.error('[popup] saving options failed', error));
    });
  }
  ui.capture.addEventListener('click', onCapture);
  ui.changeShortcut.addEventListener('click', (event) => {
    event.preventDefault();
    chrome.tabs.create({ url: SHORTCUTS_URL });
  });

  await renderShortcut();
}

init().catch((error) => {
  console.error('[popup] init failed', error);
  setStatus(t('errorUnknown', String(error)), { error: true });
});
