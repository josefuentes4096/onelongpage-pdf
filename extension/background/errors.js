// @ts-check

/**
 * Error codes. Each value is also the i18n message key shown to the user.
 */
export const ErrorCode = Object.freeze({
  RESTRICTED_PAGE: 'errorRestrictedPage',
  DEVTOOLS_OPEN: 'errorDevtoolsOpen',
  BUSY: 'errorBusy',
  CANCELED: 'errorCanceled',
  NO_TAB: 'errorNoTab',
  TOO_TALL: 'errorTooTall',
  PAGE_SCRIPT: 'errorPageScript',
  UNKNOWN: 'errorUnknown',
});

/** @typedef {typeof ErrorCode[keyof typeof ErrorCode]} ErrorCodeValue */

export class CaptureError extends Error {
  /**
   * @param {ErrorCodeValue} code
   * @param {string[]} [substitutions] Values for the message placeholders.
   * @param {{ cause?: unknown }} [options]
   */
  constructor(code, substitutions = [], options = {}) {
    super(code, options);
    this.name = 'CaptureError';
    this.code = code;
    this.substitutions = substitutions;
  }
}

/**
 * Maps any thrown value (Chrome API errors are plain `Error`s with English
 * messages) to a `CaptureError` with a stable code.
 *
 * @param {unknown} error
 * @returns {CaptureError}
 */
export function toCaptureError(error) {
  if (error instanceof CaptureError) return error;
  const message = error instanceof Error ? error.message : String(error);

  if (/Cannot access|cannot be scripted|Cannot attach|chrome:\/\/|chrome-extension:\/\//i.test(message)) {
    return new CaptureError(ErrorCode.RESTRICTED_PAGE, [], { cause: error });
  }
  if (/Another debugger is already attached/i.test(message)) {
    return new CaptureError(ErrorCode.DEVTOOLS_OPEN, [], { cause: error });
  }
  if (/No tab with id/i.test(message)) {
    return new CaptureError(ErrorCode.NO_TAB, [], { cause: error });
  }
  return new CaptureError(ErrorCode.UNKNOWN, [message], { cause: error });
}
