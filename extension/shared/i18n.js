// @ts-check

/**
 * Returns the localized message for `key`, or the key itself if it is missing
 * (so a missing translation is visible instead of rendering an empty string).
 *
 * @param {string} key
 * @param {string | string[]} [substitutions]
 * @returns {string}
 */
export function t(key, substitutions) {
  return chrome.i18n.getMessage(key, substitutions) || key;
}

/**
 * Fills elements marked with `data-i18n` (text) and `data-i18n-title` (title attribute).
 *
 * @param {ParentNode} [root]
 */
export function localizeDocument(root = document) {
  document.documentElement.lang = chrome.i18n.getUILanguage();
  for (const el of root.querySelectorAll('[data-i18n]')) {
    el.textContent = t(/** @type {HTMLElement} */ (el).dataset.i18n ?? '');
  }
  for (const el of root.querySelectorAll('[data-i18n-title]')) {
    el.setAttribute('title', t(/** @type {HTMLElement} */ (el).dataset.i18nTitle ?? ''));
  }
}
