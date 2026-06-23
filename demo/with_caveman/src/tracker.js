export const STORAGE_KEY = 'anti-bad-habit-tracker-v2';
export const GOAL_DAYS = 60;

const VALID_STATUS = new Set(['clean', 'not_clean']);

export function toLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function shiftDateKey(dateKey, deltaDays) {
    const cursor = new Date(`${dateKey}T12:00:00`);
    cursor.setDate(cursor.getDate() + deltaDays);
    return toLocalDateKey(cursor);
}

export function normalizeRecord(record, dateKey) {
    const status = VALID_STATUS.has(record?.status) ? record.status : 'not_clean';
    const journal = typeof record?.journal === 'string' ? record.journal : '';
    return {
        date: dateKey,
        status,
        journal,
    };
}

export function normalizeState(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return {
            records: {},
            reminder: {
                visible: false,
                lastShownDate: '',
            },
        };
    }

    const records = {};
    const source = raw.records && typeof raw.records === 'object' && !Array.isArray(raw.records)
        ? raw.records
        : {};

    Object.keys(source).forEach((dateKey) => {
        records[dateKey] = normalizeRecord(source[dateKey], dateKey);
    });

    return {
        records,
        reminder: {
            visible: Boolean(raw.reminder?.visible),
            lastShownDate: typeof raw.reminder?.lastShownDate === 'string' ? raw.reminder.lastShownDate : '',
        },
    };
}

export function loadState() {
    try {
        const payload = localStorage.getItem(STORAGE_KEY);
        if (!payload) {
            return normalizeState(null);
        }
        return normalizeState(JSON.parse(payload));
    } catch {
        return normalizeState(null);
    }
}

export function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function upsertDayRecord(records, dateKey, patch) {
    const base = normalizeRecord(records[dateKey], dateKey);
    const next = normalizeRecord({ ...base, ...patch }, dateKey);
    return {
        ...records,
        [dateKey]: next,
    };
}

export function getStatusForDate(records, dateKey) {
    return records[dateKey]?.status ?? 'not_clean';
}

export function getJournalForDate(records, dateKey) {
    return records[dateKey]?.journal ?? '';
}

export function backfillMissingDays(records, endDateKey = toLocalDateKey()) {
    const dateKeys = Object.keys(records).sort();
    if (dateKeys.length === 0) {
        return records;
    }

    const startDateKey = dateKeys[0];
    if (startDateKey > endDateKey) {
        return records;
    }

    let nextRecords = records;
    let changed = false;

    for (let cursor = startDateKey; cursor <= endDateKey; cursor = shiftDateKey(cursor, 1)) {
        if (!Object.hasOwn(records, cursor)) {
            if (!changed) {
                nextRecords = { ...records };
                changed = true;
            }
            nextRecords[cursor] = normalizeRecord({}, cursor);
        }
    }

    return changed ? nextRecords : records;
}

export function computeCurrentStreak(records, endDateKey = toLocalDateKey()) {
    let streak = 0;
    let cursor = endDateKey;

    for (let i = 0; i < 5000; i += 1) {
        const status = getStatusForDate(records, cursor);
        if (status !== 'clean') {
            break;
        }

        streak += 1;
        cursor = shiftDateKey(cursor, -1);
    }

    return streak;
}

export function computeGoalMetrics(currentStreak, goalDays = GOAL_DAYS) {
    const remainingDays = Math.max(goalDays - currentStreak, 0);
    const progressRatio = goalDays === 0 ? 1 : Math.min(currentStreak / goalDays, 1);

    return {
        goalDays,
        currentStreak,
        remainingDays,
        progressRatio,
    };
}

export function listRecentDates(endDateKey = toLocalDateKey(), count = 14) {
    const dates = [];
    let cursor = endDateKey;

    for (let i = 0; i < count; i += 1) {
        dates.push(cursor);
        cursor = shiftDateKey(cursor, -1);
    }

    return dates;
}

export function formatLongDate(dateKey) {
    return new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}
