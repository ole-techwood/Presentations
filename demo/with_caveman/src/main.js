import {
  backfillMissingDays,
  GOAL_DAYS,
  computeCurrentStreak,
  computeGoalMetrics,
  formatLongDate,
  getJournalForDate,
  getStatusForDate,
  listRecentDates,
  loadState,
  saveState,
  toLocalDateKey,
  upsertDayRecord,
} from './tracker';

let state = loadState();
let selectedDateKey = toLocalDateKey();
let reminderTimerId = 0;
let journalSaveTimerId = 0;

const JOURNAL_SAVE_DEBOUNCE_MS = 300;

normalizeReminderVisibility();
backfillDailyRecords();

function setDayStatus(dateKey, status) {
  state = {
    ...state,
    records: upsertDayRecord(state.records, dateKey, { status }),
  };
  persistAndRender();
}

function setDayJournal(dateKey, journal) {
  state = {
    ...state,
    records: upsertDayRecord(state.records, dateKey, { journal }),
  };
  scheduleJournalSave();
}

function scheduleJournalSave() {
  if (journalSaveTimerId) {
    globalThis.clearTimeout(journalSaveTimerId);
  }

  journalSaveTimerId = globalThis.setTimeout(() => {
    journalSaveTimerId = 0;
    saveState(state);
  }, JOURNAL_SAVE_DEBOUNCE_MS);
}

function dismissReminder() {
  state = {
    ...state,
    reminder: {
      ...state.reminder,
      visible: false,
    },
  };
  persistAndRender();
}

function persistAndRender() {
  saveState(state);
  render();
}

function maybeShowReminder(now = new Date()) {
  const today = toLocalDateKey(now);
  if (state.reminder.lastShownDate === today) {
    return;
  }

  state = {
    ...state,
    reminder: {
      visible: true,
      lastShownDate: today,
    },
  };
  persistAndRender();
}

function normalizeReminderVisibility() {
  const today = toLocalDateKey();
  if (state.reminder.lastShownDate !== today) {
    state = {
      ...state,
      reminder: {
        ...state.reminder,
        visible: false,
      },
    };
    saveState(state);
  }
}

function backfillDailyRecords() {
  const today = toLocalDateKey();
  const nextRecords = backfillMissingDays(state.records, today);

  if (nextRecords === state.records) {
    return;
  }

  state = {
    ...state,
    records: nextRecords,
  };
  saveState(state);
}

function millisecondsUntilNextTenAM(now = new Date()) {
  const next = new Date(now);
  next.setHours(10, 0, 0, 0);

  if (now >= next) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - now.getTime();
}

function scheduleReminder() {
  if (reminderTimerId) {
    globalThis.clearTimeout(reminderTimerId);
  }

  reminderTimerId = globalThis.setTimeout(() => {
    maybeShowReminder();
    scheduleReminder();
  }, millisecondsUntilNextTenAM());
}

function parseDateInput(value) {
  const fallback = toLocalDateKey();
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fallback;
  }
  return value;
}

function render() {
  const currentStreak = computeCurrentStreak(state.records, toLocalDateKey());
  const metrics = computeGoalMetrics(currentStreak, GOAL_DAYS);
  const selectedStatus = getStatusForDate(state.records, selectedDateKey);
  const selectedJournal = getJournalForDate(state.records, selectedDateKey);
  const selectedDateLabel = formatLongDate(selectedDateKey);
  const historyDates = listRecentDates(toLocalDateKey(), 14);

  document.getElementById('app').innerHTML = `
    <div class="backdrop-shape" aria-hidden="true"></div>
    <main class="layout">
      <header class="hero">
        <p class="eyebrow">Single Decision • 60 Day Goal</p>
        <h1>Anti Bad Habit Tracker</h1>
        <p class="hero-copy">One clear call each day. Clean days stack. Any not_clean day breaks streak and restarts count.</p>
      </header>

      ${state.reminder.visible ? `
        <aside class="reminder-banner" role="alert" aria-live="polite">
          <div>
            <strong>10:00 reminder</strong>
            <p>Check in now. Reminder works only while this app tab is open.</p>
          </div>
          <button id="dismiss-reminder" class="btn btn-ghost" type="button" aria-label="Dismiss reminder">Dismiss</button>
        </aside>
      ` : ''}

      <section class="panel metrics-panel" aria-label="Progress overview">
        <div class="metric">
          <span class="metric-label">Current Streak</span>
          <span class="metric-value">${metrics.currentStreak}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Days Remaining</span>
          <span class="metric-value">${metrics.remainingDays}</span>
        </div>
        <div class="metric metric-progress">
          <label for="goal-progress" class="metric-label">60 Day Progress</label>
          <progress id="goal-progress" max="${GOAL_DAYS}" value="${Math.min(metrics.currentStreak, GOAL_DAYS)}">${Math.round(metrics.progressRatio * 100)}%</progress>
          <span class="progress-text">${Math.round(metrics.progressRatio * 100)}%</span>
        </div>
      </section>

      <section class="panel checkin-panel" aria-label="Daily check in">
        <div class="date-row">
          <label for="date-picker">Editing date</label>
          <input id="date-picker" type="date" value="${selectedDateKey}" />
        </div>

        <h2>${selectedDateLabel}</h2>

        <div class="decision-group" role="radiogroup" aria-label="Daily status">
          <button class="decision decision-clean ${selectedStatus === 'clean' ? 'active' : ''}" type="button" data-status="clean" aria-pressed="${selectedStatus === 'clean'}">Clean</button>
          <button class="decision decision-not-clean ${selectedStatus === 'not_clean' ? 'active' : ''}" type="button" data-status="not_clean" aria-pressed="${selectedStatus === 'not_clean'}">Not Clean</button>
        </div>

        <p class="rule-copy">Strict rule: missed days count as not_clean in streak math.</p>

        <label for="journal-input" class="journal-label">Journal (optional)</label>
        <textarea id="journal-input" rows="4" maxlength="600" placeholder="What happened today? What helped or triggered you?">${escapeHtml(selectedJournal)}</textarea>
      </section>

      <section class="panel history-panel" aria-label="Recent history">
        <h2>Last 14 days</h2>
        <ul>
          ${historyDates.map((dateKey) => {
    const status = getStatusForDate(state.records, dateKey);
    const isSelected = dateKey === selectedDateKey;
    return `
              <li>
                <button type="button" class="history-item ${isSelected ? 'selected' : ''}" data-select-date="${dateKey}">
                  <span>${formatLongDate(dateKey)}</span>
                  <span class="status-pill ${status === 'clean' ? 'clean' : 'not-clean'}">${status}</span>
                </button>
              </li>
            `;
  }).join('')}
        </ul>
      </section>
    </main>
  `;

  const reminderButton = document.getElementById('dismiss-reminder');
  if (reminderButton) {
    reminderButton.addEventListener('click', dismissReminder);
  }

  document.getElementById('date-picker').addEventListener('change', (event) => {
    selectedDateKey = parseDateInput(event.target.value);
    render();
  });

  document.querySelectorAll('[data-status]').forEach((button) => {
    button.addEventListener('click', () => {
      setDayStatus(selectedDateKey, button.dataset.status);
    });
  });

  document.getElementById('journal-input').addEventListener('input', (event) => {
    setDayJournal(selectedDateKey, event.target.value);
  });

  document.querySelectorAll('[data-select-date]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedDateKey = parseDateInput(button.dataset.selectDate);
      render();
    });
  });
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const now = new Date();
if (now.getHours() >= 10 && state.reminder.lastShownDate !== toLocalDateKey(now)) {
  maybeShowReminder(now);
}

scheduleReminder();
render();
