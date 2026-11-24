import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatFileTimestamp,
  formatLocalTimestamp,
  formatUtcOffset,
  formatUtcTimestamp,
} from '../extension/shared/time.js';

describe('formatUtcOffset', () => {
  it('formats negative, positive, zero and half-hour offsets', () => {
    assert.equal(formatUtcOffset(-180), 'UTC-03:00');
    assert.equal(formatUtcOffset(60), 'UTC+01:00');
    assert.equal(formatUtcOffset(0), 'UTC+00:00');
    assert.equal(formatUtcOffset(330), 'UTC+05:30');
    assert.equal(formatUtcOffset(-570), 'UTC-09:30');
  });
});

describe('formatUtcTimestamp', () => {
  it('returns ISO 8601 UTC without milliseconds', () => {
    assert.equal(formatUtcTimestamp(new Date('2026-11-24T17:03:22.789Z')), '2026-11-24T17:03:22Z');
  });
});

describe('formatLocalTimestamp', () => {
  it('uses local wall-clock time and the matching offset', () => {
    const date = new Date(2026, 0, 5, 7, 8, 9);
    const expectedOffset = formatUtcOffset(-date.getTimezoneOffset());
    assert.equal(formatLocalTimestamp(date), `2026-01-05 07:08:09 ${expectedOffset}`);
  });
});

describe('formatFileTimestamp', () => {
  it('has no characters invalid in file names', () => {
    const stamp = formatFileTimestamp(new Date(2026, 10, 24, 14, 3, 22));
    assert.equal(stamp, '2026-11-24_140322');
    assert.doesNotMatch(stamp, /[\\/:*?"<>|]/);
  });
});
