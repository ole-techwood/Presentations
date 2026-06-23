import { describe, expect, it } from 'vitest';
import { backfillMissingDays, computeCurrentStreak, computeGoalMetrics } from './tracker';

describe('computeCurrentStreak', () => {
    it('counts consecutive clean days from end date', () => {
        const records = {
            '2026-06-19': { date: '2026-06-19', status: 'not_clean', journal: '' },
            '2026-06-20': { date: '2026-06-20', status: 'clean', journal: '' },
            '2026-06-21': { date: '2026-06-21', status: 'clean', journal: '' },
        };

        expect(computeCurrentStreak(records, '2026-06-21')).toBe(2);
    });

    it('treats missed days as not_clean and breaks streak', () => {
        const records = {
            '2026-06-19': { date: '2026-06-19', status: 'clean', journal: '' },
            '2026-06-21': { date: '2026-06-21', status: 'clean', journal: '' },
        };

        expect(computeCurrentStreak(records, '2026-06-21')).toBe(1);
    });

    it('returns zero when end day is not clean', () => {
        const records = {
            '2026-06-21': { date: '2026-06-21', status: 'not_clean', journal: '' },
        };

        expect(computeCurrentStreak(records, '2026-06-21')).toBe(0);
    });
});

describe('computeGoalMetrics', () => {
    it('clamps remaining days and progress ratio', () => {
        expect(computeGoalMetrics(12, 60)).toEqual({
            goalDays: 60,
            currentStreak: 12,
            remainingDays: 48,
            progressRatio: 0.2,
        });

        expect(computeGoalMetrics(99, 60)).toEqual({
            goalDays: 60,
            currentStreak: 99,
            remainingDays: 0,
            progressRatio: 1,
        });
    });
});

describe('backfillMissingDays', () => {
    it('adds explicit not_clean records for gaps up to end date', () => {
        const records = {
            '2026-06-19': { date: '2026-06-19', status: 'clean', journal: '' },
            '2026-06-21': { date: '2026-06-21', status: 'clean', journal: '' },
        };

        const nextRecords = backfillMissingDays(records, '2026-06-21');

        expect(nextRecords).toEqual({
            '2026-06-19': { date: '2026-06-19', status: 'clean', journal: '' },
            '2026-06-20': { date: '2026-06-20', status: 'not_clean', journal: '' },
            '2026-06-21': { date: '2026-06-21', status: 'clean', journal: '' },
        });
    });

    it('returns same records when no gaps are present', () => {
        const records = {
            '2026-06-20': { date: '2026-06-20', status: 'not_clean', journal: '' },
            '2026-06-21': { date: '2026-06-21', status: 'clean', journal: '' },
        };

        const nextRecords = backfillMissingDays(records, '2026-06-21');

        expect(nextRecords).toEqual(records);
    });
});
