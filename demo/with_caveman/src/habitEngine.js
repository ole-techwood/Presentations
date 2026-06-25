export const STORAGE_KEY = 'habit_tracker_v2';
export const MILESTONES = [3, 7, 30, 60];
export const ARCHIVE_STREAK = 60;
export const HISTORY_WINDOW_DAYS = 180;
export const JOURNAL_MAX_LENGTH = 1000;

export function toDayKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function addDays(dayKey, daysToAdd) {
    const [year, month, day] = dayKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + daysToAdd);
    return toDayKey(date);
}

export function canCheckInDate(selectedDayKey, nowDayKey = toDayKey()) {
    return selectedDayKey <= nowDayKey;
}

function sortUniqueMilestones(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    const set = new Set(value.filter((item) => Number.isInteger(item) && MILESTONES.includes(item)));
    return Array.from(set).sort((a, b) => a - b);
}

function normalizeStatusByDate(value, legacyCheckedDates = []) {
    const statusByDate = {};

    if (value && typeof value === 'object') {
        for (const [dateKey, status] of Object.entries(value)) {
            if (status === 'clean' || status === 'missed') {
                statusByDate[dateKey] = status;
            }
        }
    }

    if (Array.isArray(legacyCheckedDates)) {
        legacyCheckedDates.forEach((dateKey) => {
            if (typeof dateKey === 'string' && !(dateKey in statusByDate)) {
                statusByDate[dateKey] = 'clean';
            }
        });
    }

    return statusByDate;
}

function normalizeJournalEntries(value) {
    const journalEntries = {};
    if (!value || typeof value !== 'object') {
        return journalEntries;
    }

    for (const [dateKey, text] of Object.entries(value)) {
        if (typeof text === 'string' || text == null) {
            journalEntries[dateKey] = normalizeJournalText(text);
        }
    }

    return journalEntries;
}

function normalizeJournalText(text) {
    return String(text ?? '').trim().slice(0, JOURNAL_MAX_LENGTH);
}

export function computeStreak(habit, nowDayKey = toDayKey()) {
    const statusByDate = habit.statusByDate || {};
    const todayStatus = statusByDate[nowDayKey];

    if (todayStatus === 'missed') {
        return 0;
    }

    let cursor = todayStatus ? nowDayKey : addDays(nowDayKey, -1);
    let streak = 0;

    while (true) {
        const status = statusByDate[cursor];
        if (status !== 'clean') {
            break;
        }
        streak += 1;
        cursor = addDays(cursor, -1);
    }

    return streak;
}

function applyBadges(streak) {
    return MILESTONES.filter((value) => streak >= value);
}

function ensureBrokenState(habit, nowDayKey) {
    if (habit.streak >= ARCHIVE_STREAK) {
        habit.isBroken = true;
        habit.archivedAt = habit.archivedAt || nowDayKey;
    }
    return habit;
}

export function normalizeHabit(habit, fallbackId) {
    const safeHabit = {
        id: typeof habit?.id === 'string' ? habit.id : fallbackId,
        name: typeof habit?.name === 'string' && habit.name.trim() ? habit.name.trim() : 'Untitled habit',
        createdAt: typeof habit?.createdAt === 'string' ? habit.createdAt : toDayKey(),
        statusByDate: normalizeStatusByDate(habit?.statusByDate, habit?.checkedDates),
        streak: 0,
        badgesUnlocked: sortUniqueMilestones(habit?.badgesUnlocked),
        isBroken: Boolean(habit?.isBroken),
        archivedAt: typeof habit?.archivedAt === 'string' ? habit.archivedAt : null,
        journalEntries: normalizeJournalEntries(habit?.journalEntries),
    };

    safeHabit.streak = computeStreak(safeHabit, toDayKey());
    safeHabit.badgesUnlocked = applyBadges(safeHabit.streak);
    return ensureBrokenState(safeHabit, toDayKey());
}

export function migrateState(rawData) {
    if (!rawData || typeof rawData !== 'object') {
        return { habits: [] };
    }

    if (!Array.isArray(rawData.habits)) {
        return { habits: [] };
    }

    const habits = rawData.habits.map((habit, index) => normalizeHabit(habit, `habit-${index + 1}`));
    return { habits };
}

export function createHabit(name, nowDayKey = toDayKey(), id = String(Date.now())) {
    return {
        id,
        name: name.trim(),
        createdAt: nowDayKey,
        statusByDate: {},
        streak: 0,
        badgesUnlocked: [],
        isBroken: false,
        archivedAt: null,
        journalEntries: {},
    };
}

export function reconcileHabit(habit, nowDayKey = toDayKey()) {
    const updated = normalizeHabit(habit, habit.id || String(Date.now()));
    const historyStartDay = addDays(nowDayKey, -(HISTORY_WINDOW_DAYS - 1));
    const compactedStatusByDate = {};

    for (const [dateKey, status] of Object.entries(updated.statusByDate)) {
        if (dateKey >= historyStartDay && dateKey <= nowDayKey) {
            compactedStatusByDate[dateKey] = status;
        }
    }

    updated.statusByDate = compactedStatusByDate;

    const knownDays = Object.keys(updated.statusByDate).sort((left, right) => left.localeCompare(right));
    const firstTrackedDay = [updated.createdAt, historyStartDay]
        .sort((left, right) => left.localeCompare(right))
        .at(-1);
    const lastKnownDay = knownDays.length ? knownDays.at(-1) : addDays(firstTrackedDay, -1);

    let cursor = addDays(lastKnownDay, 1);
    if (cursor < historyStartDay) {
        cursor = historyStartDay;
    }

    while (cursor < nowDayKey) {
        if (!updated.statusByDate[cursor]) {
            updated.statusByDate[cursor] = 'missed';
        }
        cursor = addDays(cursor, 1);
    }

    updated.streak = computeStreak(updated, nowDayKey);
    updated.badgesUnlocked = applyBadges(updated.streak);
    return ensureBrokenState(updated, nowDayKey);
}

export function applyCheckIn(habit, dateKey, status, nowDayKey = toDayKey()) {
    const updated = reconcileHabit(habit, nowDayKey);

    if (!canCheckInDate(dateKey, nowDayKey)) {
        return updated;
    }

    if (status !== 'clean' && status !== 'missed') {
        return updated;
    }

    updated.statusByDate[dateKey] = status;
    updated.streak = computeStreak(updated, nowDayKey);
    updated.badgesUnlocked = applyBadges(updated.streak);
    return ensureBrokenState(updated, nowDayKey);
}

export function setJournalEntry(habit, dateKey, text) {
    const updated = { ...habit, journalEntries: { ...(habit.journalEntries ?? undefined) } };
    updated.journalEntries[dateKey] = normalizeJournalText(text);
    return updated;
}

export function getNextMilestone(streak) {
    return MILESTONES.find((value) => value > streak) || ARCHIVE_STREAK;
}
