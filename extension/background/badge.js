// @ts-check
import { t } from '../shared/i18n.js';

const COLOR_BUSY = '#1a73e8';
const COLOR_ERROR = '#c5221f';
const ERROR_DISPLAY_MS = 15_000;

/**
 * Badge updates are best-effort: the tab may close mid-capture, which makes
 * these calls reject. That must never mask the real result.
 *
 * @param {Promise<unknown>} promise
 */
function ignoreFailure(promise) {
  promise.catch((error) => console.debug('[badge] update failed', error));
}

/** @param {number} tabId */
export function showBusy(tabId) {
  ignoreFailure(chrome.action.setBadgeBackgroundColor({ color: COLOR_BUSY, tabId }));
  ignoreFailure(chrome.action.setBadgeText({ text: '…', tabId }));
}

/** @param {number} tabId */
export function clearBadge(tabId) {
  ignoreFailure(chrome.action.setBadgeText({ text: '', tabId }));
  ignoreFailure(chrome.action.setTitle({ title: t('actionTitle'), tabId }));
}

/**
 * Shows an error on the toolbar icon (used when no popup is open, e.g. after
 * the keyboard shortcut or the context menu). The message is in the tooltip.
 *
 * @param {number} tabId
 * @param {string} message
 */
export function showError(tabId, message) {
  ignoreFailure(chrome.action.setBadgeBackgroundColor({ color: COLOR_ERROR, tabId }));
  ignoreFailure(chrome.action.setBadgeText({ text: '!', tabId }));
  ignoreFailure(chrome.action.setTitle({ title: t('badgeErrorTitle', message), tabId }));
  setTimeout(() => clearBadge(tabId), ERROR_DISPLAY_MS);
}
