// @ts-check
import { localizeDocument, t } from '../shared/i18n.js';
import { MessageType } from '../shared/messages.js';
import { CM_PER_IN } from '../shared/units.js';

/** @typedef {import('../shared/messages.js').CaptureResult} CaptureResult */

const BYTES_PER_KB = 1024;

/**
 * @param {string} id
 * @returns {HTMLElement}
 */
function byId(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}

/** @param {string} text */
function showMessage(text) {
  const message = byId('message');
  message.textContent = text;
  message.hidden = false;
}

/**
 * @param {string} base64
 * @returns {Uint8Array<ArrayBuffer>}
 */
function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function init() {
  localizeDocument();

  const id = new URLSearchParams(location.search).get('id');
  /** @type {CaptureResult | null} */
  const result = id ? await chrome.runtime.sendMessage({ type: MessageType.TAKE_RESULT, id }) : null;
  if (!result) {
    byId('viewer').hidden = true;
    showMessage(t('resultUnavailable'));
    return;
  }

  const bytes = base64ToBytes(result.data);
  const blobUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  window.addEventListener('pagehide', () => URL.revokeObjectURL(blobUrl), { once: true });

  document.title = result.filename;
  byId('name').textContent = result.filename;
  const info = byId('info');
  info.textContent = t('resultInfo', [
    String(Math.round(result.paperHeightIn * CM_PER_IN)),
    String(Math.round(bytes.length / BYTES_PER_KB)),
    new Date(result.capturedAt).toLocaleString(chrome.i18n.getUILanguage()),
  ]);
  info.title = result.url;
  /** @type {HTMLIFrameElement} */ (byId('viewer')).src = blobUrl;

  const download = async () => {
    try {
      await chrome.downloads.download({ url: blobUrl, filename: result.filename, saveAs: result.saveAs });
    } catch (error) {
      showMessage(t('resultDownloadFailed', error instanceof Error ? error.message : String(error)));
    }
  };
  const button = byId('download');
  button.hidden = false;
  button.addEventListener('click', download);
  await download();
}

init().catch((error) => {
  console.error('[result] init failed', error);
  showMessage(t('errorUnknown', String(error)));
});
