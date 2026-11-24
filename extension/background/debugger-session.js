// @ts-check
import { CaptureError, ErrorCode } from './errors.js';

const PROTOCOL_VERSION = '1.3';

/**
 * Minimal interface the capture flow needs. Implemented by `DebuggerSession`
 * in the extension and by a WebSocket CDP client in the end-to-end tests.
 *
 * @typedef {object} CdpSession
 * @property {<T = Record<string, any>>(method: string, params?: object) => Promise<T>} send
 * @property {<R>(fn: (...args: any[]) => R | Promise<R>, ...args: unknown[]) => Promise<R>} run
 */

/**
 * Runs a self-contained function inside the page through `Runtime.evaluate`
 * and returns its (JSON-serializable) result. The function is serialized with
 * `Function#toString`, so it must not reference outer variables or imports;
 * everything it needs goes through `args`.
 *
 * @template R
 * @param {CdpSession['send']} send
 * @param {(...args: any[]) => R | Promise<R>} fn
 * @param {unknown[]} args JSON-serializable arguments.
 * @returns {Promise<R>}
 */
export async function runInPage(send, fn, args) {
  const expression = `(${fn.toString()})(...${JSON.stringify(args)})`;
  /** @type {{ result: { value: R }, exceptionDetails?: { text: string, exception?: { description?: string } } }} */
  const response = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: false,
  });
  if (response.exceptionDetails) {
    const details = response.exceptionDetails.exception?.description ?? response.exceptionDetails.text;
    throw new CaptureError(ErrorCode.PAGE_SCRIPT, [details]);
  }
  return response.result.value;
}

/**
 * Thin wrapper around `chrome.debugger` for one tab: attach/detach, typed-ish
 * commands, running local functions inside the page, and tracking whether
 * the user canceled the session from Chrome's infobar.
 */
export class DebuggerSession {
  /** @type {chrome.debugger.Debuggee} */
  #target;
  #attached = false;
  /** @type {string | null} */
  #detachReason = null;
  /** @type {(source: chrome.debugger.Debuggee, reason: string) => void} */
  #onDetach;

  /** @param {number} tabId */
  constructor(tabId) {
    this.#target = { tabId };
    this.#onDetach = (source, reason) => {
      if (source.tabId === tabId) {
        this.#attached = false;
        this.#detachReason = reason;
      }
    };
  }

  /** True if the user closed the debugging infobar ("Cancel"). */
  get canceledByUser() {
    return this.#detachReason === 'canceled_by_user';
  }

  async attach() {
    chrome.debugger.onDetach.addListener(this.#onDetach);
    await chrome.debugger.attach(this.#target, PROTOCOL_VERSION);
    this.#attached = true;
  }

  async detach() {
    chrome.debugger.onDetach.removeListener(this.#onDetach);
    if (!this.#attached) return;
    this.#attached = false;
    try {
      await chrome.debugger.detach(this.#target);
    } catch (error) {
      // The tab may have been closed already; nothing left to clean up.
      console.debug('[debugger-session] detach failed', error);
    }
  }

  /**
   * Sends a Chrome DevTools Protocol command.
   *
   * @template [T=Record<string, any>]
   * @param {string} method
   * @param {object} [params]
   * @returns {Promise<T>}
   */
  async send(method, params = {}) {
    return /** @type {Promise<T>} */ (chrome.debugger.sendCommand(this.#target, method, params));
  }

  /**
   * Runs a self-contained function inside the page (see `runInPage`).
   *
   * @template R
   * @param {(...args: any[]) => R | Promise<R>} fn
   * @param {...unknown} args JSON-serializable arguments.
   * @returns {Promise<R>}
   */
  async run(fn, ...args) {
    return runInPage((method, params) => this.send(method, params), fn, args);
  }
}
