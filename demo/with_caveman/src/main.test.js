import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    ARCHIVE_STREAK,
    HISTORY_WINDOW_DAYS,
    JOURNAL_MAX_LENGTH,
    MILESTONES,
    applyCheckIn,
    canCheckInDate,
    createHabit,
    migrateState,
    reconcileHabit,
    setJournalEntry,
} from './habitEngine.js';

function addDays(baseDayKey, offset) {
    const [year, month, day] = baseDayKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + offset);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function cssRuleBlock(cssText, selector) {
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    const match = cssText.match(new RegExp(String.raw`${escapedSelector}\s*\{([\s\S]*?)\}`));
    return match?.[1] || '';
}

describe('habitEngine', () => {
    it('migrates legacy checkedDates payload into new schema safely', () => {
        const migrated = migrateState({
            habits: [
                {
                    id: '1',
                    name: 'No sugar',
                    createdAt: '2026-06-20',
                    checkedDates: ['2026-06-20', '2026-06-21'],
                },
            ],
        });

        expect(migrated.habits).toHaveLength(1);
        expect(migrated.habits[0].statusByDate['2026-06-20']).toBe('clean');
        expect(migrated.habits[0].statusByDate['2026-06-21']).toBe('clean');
        expect(migrated.habits[0].journalEntries).toEqual({});
        expect(migrated.habits[0].badgesUnlocked).toEqual([]);
        expect(migrated.habits[0].isBroken).toBe(false);
    });

    it('recovers from malformed payload to safe defaults', () => {
        const migrated = migrateState('not-an-object');
        expect(migrated).toEqual({ habits: [] });
    });

    it('blocks future date check-ins', () => {
        expect(canCheckInDate('2026-06-25', '2026-06-24')).toBe(false);
        expect(canCheckInDate('2026-06-24', '2026-06-24')).toBe(true);
    });

    it('resets streak when missed day appears', () => {
        let habit = createHabit('No doomscroll', '2026-06-20', 'h1');
        habit = applyCheckIn(habit, '2026-06-20', 'clean', '2026-06-20');
        habit = applyCheckIn(habit, '2026-06-21', 'clean', '2026-06-21');
        habit = applyCheckIn(habit, '2026-06-22', 'clean', '2026-06-22');

        expect(habit.streak).toBe(3);

        habit = applyCheckIn(habit, '2026-06-23', 'missed', '2026-06-23');
        expect(habit.streak).toBe(0);
    });

    it('unlocks milestones exactly at 3, 7, 30, 60', () => {
        let habit = createHabit('No alcohol', '2026-01-01', 'h2');

        for (let day = 1; day <= ARCHIVE_STREAK; day += 1) {
            const dayKey = addDays('2026-01-01', day - 1);
            habit = applyCheckIn(habit, dayKey, 'clean', dayKey);

            const expected = MILESTONES.filter((m) => m <= day);
            expect(habit.badgesUnlocked).toEqual(expected);
        }
    });

    it('archives habit at 60 consecutive clean days', () => {
        let habit = createHabit('No smoking', '2026-01-01', 'h3');
        let lastDayKey = '2026-01-01';

        for (let day = 1; day <= ARCHIVE_STREAK; day += 1) {
            const dayKey = addDays('2026-01-01', day - 1);
            habit = applyCheckIn(habit, dayKey, 'clean', dayKey);
            lastDayKey = dayKey;
        }

        expect(habit.streak).toBe(ARCHIVE_STREAK);
        expect(habit.isBroken).toBe(true);
        expect(habit.archivedAt).toBe(lastDayKey);
    });

    it('auto-marks missed days on reconcile after gap', () => {
        let habit = createHabit('No gossip', '2026-06-20', 'h4');
        habit = applyCheckIn(habit, '2026-06-20', 'clean', '2026-06-20');
        habit = reconcileHabit(habit, '2026-06-24');

        expect(habit.statusByDate['2026-06-21']).toBe('missed');
        expect(habit.statusByDate['2026-06-22']).toBe('missed');
        expect(habit.statusByDate['2026-06-23']).toBe('missed');
        expect(habit.streak).toBe(0);
    });

    it('stores journal entry per date and habit', () => {
        let habit = createHabit('No junk food', '2026-06-24', 'h5');
        habit = setJournalEntry(habit, '2026-06-24', 'Hard day but clean.');

        expect(habit.journalEntries['2026-06-24']).toBe('Hard day but clean.');
    });

    it('enforces journal trim and max length at write boundary', () => {
        let habit = createHabit('No junk food', '2026-06-24', 'h6');
        const longValue = `   ${'a'.repeat(JOURNAL_MAX_LENGTH + 25)}   `;

        habit = setJournalEntry(habit, '2026-06-24', longValue);

        expect(habit.journalEntries['2026-06-24']).toHaveLength(JOURNAL_MAX_LENGTH);
        expect(habit.journalEntries['2026-06-24']).toBe('a'.repeat(JOURNAL_MAX_LENGTH));
    });

    it('caps reconciled history window to prevent unbounded growth', () => {
        let habit = createHabit('No gossip', '2025-01-01', 'h7');
        habit = applyCheckIn(habit, '2025-01-01', 'clean', '2025-01-01');

        habit = reconcileHabit(habit, '2026-06-24');

        const keys = Object.keys(habit.statusByDate).sort((left, right) => left.localeCompare(right));
        expect(keys.length).toBeLessThanOrEqual(HISTORY_WINDOW_DAYS);
        expect(keys[0]).toBe(addDays('2026-06-24', -(HISTORY_WINDOW_DAYS - 1)));
        expect(habit.statusByDate['2026-06-23']).toBe('missed');
    });

    it('keeps modal backdrop full-screen and strips native dialog chrome', () => {
        const css = readFileSync(resolve(__dirname, './style.css'), 'utf8');
        const modalBackdrop = cssRuleBlock(css, '.modal-backdrop');

        expect(modalBackdrop).toContain('inset: 0');
        expect(modalBackdrop).toContain('border: none');
        expect(modalBackdrop).toContain('margin: 0');
        expect(modalBackdrop).toContain('padding: 0');
        expect(modalBackdrop).toContain('width: 100vw');
        expect(modalBackdrop).toContain('height: 100vh');
    });
});
