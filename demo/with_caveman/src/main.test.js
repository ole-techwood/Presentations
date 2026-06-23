// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('journal input behavior', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    document.body.innerHTML = '<div id="app"></div>';

    vi.stubGlobal('setTimeout', vi.fn(() => 1));
    vi.stubGlobal('clearTimeout', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not replace journal textarea node on input', async () => {
    await import('./main.js');

    const journal = document.getElementById('journal-input');
    journal.focus();

    journal.value = 'A';
    journal.dispatchEvent(new Event('input', { bubbles: true }));

    const journalAfterInput = document.getElementById('journal-input');

    expect(journalAfterInput).toBe(journal);
    expect(document.activeElement).toBe(journalAfterInput);
  });
});

describe('reminder scheduling', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    document.body.innerHTML = '<div id="app"></div>';
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-21T09:59:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows reminder at 10:00 and again the next day after dismiss', async () => {
    await import('./main.js');

    expect(document.querySelector('.reminder-banner')).toBeNull();

    vi.advanceTimersByTime(60_000);
    expect(document.querySelector('.reminder-banner')).not.toBeNull();

    document.getElementById('dismiss-reminder').click();
    expect(document.querySelector('.reminder-banner')).toBeNull();

    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(document.querySelector('.reminder-banner')).not.toBeNull();
  });
});

describe('journal persistence cadence', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    document.body.innerHTML = '<div id="app"></div>';
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-21T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('debounces journal saves by 300ms', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    await import('./main.js');

    const baselineSaves = setItemSpy.mock.calls.length;
    const journal = document.getElementById('journal-input');

    journal.value = 'A';
    journal.dispatchEvent(new Event('input', { bubbles: true }));

    expect(setItemSpy.mock.calls.length).toBe(baselineSaves);

    vi.advanceTimersByTime(299);
    expect(setItemSpy.mock.calls.length).toBe(baselineSaves);

    vi.advanceTimersByTime(1);
    expect(setItemSpy.mock.calls.length).toBe(baselineSaves + 1);
  });
});
