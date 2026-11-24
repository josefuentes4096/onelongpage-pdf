// @ts-check
import { t } from '../shared/i18n.js';
import { MessageType } from '../shared/messages.js';
import { loadOptions, normalizeOptions } from '../shared/options.js';
import { clearBadge, showBusy, showError } from './badge.js';
import { captureTab } from './capture.js';
import { CaptureError, ErrorCode, toCaptureError } from './errors.js';
import { takeResult } from './result-store.js';

/** @typedef {import('../shared/options.js').CaptureOptions} CaptureOptions */
/** @typedef {import('../shared/messages.js').CaptureResponse} CaptureResponse */

const CONTEXT_MENU_CAPTURE = 'capture-page';
const COMMAND_CAPTURE = 'capture-page';

// All listeners are registered synchronously at top level, as MV3 requires
// for the service worker to be woken up by these events.

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_CAPTURE,
      title: t('contextMenuCapturePage'),
      contexts: ['page'],
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_CAPTURE || tab?.id === undefined) return;
  await captureWithFeedback(tab.id, await loadOptions());
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== COMMAND_CAPTURE) return;
  const tabId = tab?.id ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
  if (tabId === undefined) return;
  await captureWithFeedback(tabId, await loadOptions());
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only accept messages from this extension's own pages.
  if (sender.id !== chrome.runtime.id || !message || typeof message !== 'object') return false;

  switch (message.type) {
    case MessageType.CAPTURE_TAB: {
      if (!Number.isInteger(message.tabId)) {
        sendResponse(errorResponse(new CaptureError(ErrorCode.NO_TAB)));
        return false;
      }
      captureWithFeedback(message.tabId, normalizeOptions(message.options)).then(sendResponse);
      return true; // Keeps the channel open for the async response.
    }
    case MessageType.TAKE_RESULT: {
      sendResponse(typeof message.id === 'string' ? takeResult(message.id) : null);
      return false;
    }
    default:
      return false;
  }
});

/**
 * Runs a capture, reflecting progress and errors on the toolbar icon.
 * Never rejects: errors are returned as `{ ok: false, error }`.
 *
 * @param {number} tabId
 * @param {CaptureOptions} options
 * @returns {Promise<CaptureResponse>}
 */
async function captureWithFeedback(tabId, options) {
  showBusy(tabId);
  try {
    const { paperHeightIn } = await captureTab(tabId, options);
    clearBadge(tabId);
    return { ok: true, paperHeightIn };
  } catch (error) {
    const response = errorResponse(toCaptureError(error));
    console.error('[service-worker] capture failed', error);
    showError(tabId, response.error);
    return response;
  }
}

/**
 * @param {CaptureError} error
 * @returns {{ ok: false, error: string }}
 */
function errorResponse(error) {
  return { ok: false, error: t(error.code, error.substitutions) };
}
