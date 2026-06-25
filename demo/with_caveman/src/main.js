import {
    ARCHIVE_STREAK,
    JOURNAL_MAX_LENGTH,
    STORAGE_KEY,
    applyCheckIn,
    canCheckInDate,
    createHabit,
    getNextMilestone,
    migrateState,
    reconcileHabit,
    setJournalEntry,
    toDayKey,
} from './habitEngine.js';

function loadData() {
    try {
        const v2 = localStorage.getItem(STORAGE_KEY);
        if (v2) {
            return migrateState(JSON.parse(v2));
        }

        const legacy = localStorage.getItem('habit_tracker_v1');
        if (legacy) {
            return migrateState(JSON.parse(legacy));
        }
    } catch {
        return { habits: [] };
    }

    return { habits: [] };
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

const ui = {
    habitInput: document.getElementById('habitInput'),
    addBtn: document.getElementById('addBtn'),
    habitList: document.getElementById('habitList'),
    archivedList: document.getElementById('archivedList'),
    archivedSection: document.getElementById('archivedSection'),
    progressBar: document.getElementById('progressBar'),
    progressChip: document.getElementById('progressChip'),
    emptyState: document.getElementById('emptyState'),
    currentDate: document.getElementById('currentDate'),
    snackbar: document.getElementById('snackbar'),
    modalBackdrop: document.getElementById('modalBackdrop'),
    modalEl: document.getElementById('modal'),
    modalClose: document.getElementById('modalClose'),
    modalTitle: document.getElementById('modalTitle'),
    modalStreak: document.getElementById('modalStreak'),
    modalNext: document.getElementById('modalNext'),
    modalProgressText: document.getElementById('modalProgressText'),
    modalProgressBar: document.getElementById('modalProgressBar'),
    modalDateInput: document.getElementById('modalDateInput'),
    modalMarkClean: document.getElementById('modalMarkClean'),
    modalMarkMissed: document.getElementById('modalMarkMissed'),
    modalCalendar: document.getElementById('modalCalendar'),
    modalBadges: document.getElementById('modalBadges'),
    modalJournal: document.getElementById('modalJournal'),
};

let state = loadData();
let openHabitId = null;
let modalOpener = null;
let snackbarTimer = null;
let journalDebounceTimer = null;
const JOURNAL_DEBOUNCE_MS = 500;
let lastPersistedState = localStorage.getItem(STORAGE_KEY) ? JSON.stringify(state) : '';

function showSnackbar(message) {
    clearTimeout(snackbarTimer);
    ui.snackbar.textContent = message;
    ui.snackbar.classList.add('show');
    snackbarTimer = setTimeout(() => ui.snackbar.classList.remove('show'), 2200);
}

function formatTodayHeadline(dayKey) {
    const [year, month, day] = dayKey.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });
}

function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

function getHabitIndex(habitId) {
    return state.habits.findIndex((habit) => habit.id === habitId);
}

function persist() {
    const nextSerializedState = JSON.stringify(state);
    if (nextSerializedState === lastPersistedState) {
        return;
    }
    saveData(state);
    lastPersistedState = nextSerializedState;
}

function withHabit(habitId, operation) {
    const index = getHabitIndex(habitId);
    if (index < 0) {
        return;
    }
    state.habits[index] = operation(state.habits[index]);
}

function reconcileAll(nowDayKey) {
    state.habits = state.habits.map((habit) => reconcileHabit(habit, nowDayKey));
}

function addHabit() {
    const name = ui.habitInput.value.trim();
    if (!name) {
        return;
    }

    const nowDayKey = toDayKey();
    state.habits.push(createHabit(name, nowDayKey, crypto.randomUUID()));
    ui.habitInput.value = '';

    persist();
    render();
    showSnackbar('Habit added');
}

function deleteHabit(habitId) {
    state.habits = state.habits.filter((habit) => habit.id !== habitId);
    persist();
    render();
    showSnackbar('Habit removed');
}

function markTodayClean(habitId, checked) {
    const nowDayKey = toDayKey();
    withHabit(habitId, (habit) => {
        if (!checked) {
            const copy = {
                ...habit,
                statusByDate: { ...habit.statusByDate },
            };
            delete copy.statusByDate[nowDayKey];
            return reconcileHabit(copy, nowDayKey);
        }
        return applyCheckIn(habit, nowDayKey, 'clean', nowDayKey);
    });
    persist();
    render();
}

function getHabitById(habitId) {
    return state.habits.find((habit) => habit.id === habitId);
}

function openModal(habitId) {
    const habit = getHabitById(habitId);
    if (!habit) {
        return;
    }

    openHabitId = habitId;
    modalOpener = document.activeElement;
    ui.modalDateInput.max = toDayKey();
    ui.modalDateInput.value = toDayKey();
    ui.modalJournal.maxLength = JOURNAL_MAX_LENGTH;

    ui.modalBackdrop.hidden = false;
    ui.modalEl.setAttribute('tabindex', '-1');
    ui.modalEl.focus();

    renderModal();
}

function closeModal() {
    flushJournalDebounce();
    openHabitId = null;
    ui.modalBackdrop.hidden = true;
    if (modalOpener) {
        modalOpener.focus();
        modalOpener = null;
    }
}

function commitJournalText() {
    if (!openHabitId) {
        return;
    }

    const selectedDayKey = ui.modalDateInput.value || toDayKey();
    const text = ui.modalJournal.value;
    const index = getHabitIndex(openHabitId);

    if (index < 0) {
        return;
    }

    const currentHabit = state.habits[index];
    const nextHabit = setJournalEntry(currentHabit, selectedDayKey, text);
    const previousValue = currentHabit.journalEntries[selectedDayKey] ?? '';
    const nextValue = nextHabit.journalEntries[selectedDayKey] ?? '';

    if (previousValue === nextValue) {
        return;
    }

    state.habits[index] = nextHabit;
    persist();

    // Intentional MVP bug: typing in journal forces full app re-render.
    render();
    renderModal();
}

function flushJournalDebounce() {
    if (!journalDebounceTimer) {
        return;
    }

    clearTimeout(journalDebounceTimer);
    journalDebounceTimer = null;
    commitJournalText();
}

function renderBadgeItem(day, unlocked) {
    return `<span class="badge ${unlocked ? 'badge--unlocked' : ''}">${day}d</span>`;
}

function renderModal() {
    if (!openHabitId) {
        return;
    }

    const habit = getHabitById(openHabitId);
    if (!habit) {
        closeModal();
        return;
    }

    const nowDayKey = toDayKey();
    const selectedDayKey = ui.modalDateInput.value || nowDayKey;
    const canMark = canCheckInDate(selectedDayKey, nowDayKey) && !habit.isBroken;
    const nextMilestone = getNextMilestone(habit.streak);
    const progressPercent = Math.min(100, Math.round((habit.streak / ARCHIVE_STREAK) * 100));

    ui.modalTitle.textContent = habit.name;
    ui.modalStreak.textContent = String(habit.streak);
    ui.modalNext.textContent = habit.streak >= ARCHIVE_STREAK ? 'Archived' : `${nextMilestone} days`;
    ui.modalProgressText.textContent = `${habit.streak}/${ARCHIVE_STREAK} clean days`;
    ui.modalProgressBar.style.width = `${progressPercent}%`;
    ui.modalMarkClean.disabled = !canMark;
    ui.modalMarkMissed.disabled = !canMark;
    ui.modalDateInput.setAttribute('aria-invalid', canMark ? 'false' : 'true');

    ui.modalBadges.innerHTML = [3, 7, 30, 60]
        .map((milestone) => renderBadgeItem(milestone, habit.badgesUnlocked.includes(milestone)))
        .join('');

    ui.modalCalendar.innerHTML = '';
    for (let offset = 27; offset >= 0; offset -= 1) {
        const dayKey = (() => {
            const [year, month, day] = nowDayKey.split('-').map(Number);
            const dayDate = new Date(year, month - 1, day);
            dayDate.setDate(dayDate.getDate() - offset);
            return toDayKey(dayDate);
        })();

        const status = habit.statusByDate[dayKey] || 'none';
        const dayNode = document.createElement('div');
        dayNode.className = 'modal__calendar-day';
        dayNode.dataset.status = status;
        dayNode.textContent = dayKey.slice(-2);
        dayNode.title = `${dayKey} (${status})`;
        ui.modalCalendar.appendChild(dayNode);
    }

    ui.modalJournal.value = habit.journalEntries[selectedDayKey] || '';
}

function applyModalCheckIn(status) {
    if (!openHabitId) {
        return;
    }

    const selectedDayKey = ui.modalDateInput.value;
    const nowDayKey = toDayKey();

    if (!canCheckInDate(selectedDayKey, nowDayKey)) {
        showSnackbar('Future date blocked');
        renderModal();
        return;
    }

    withHabit(openHabitId, (habit) => applyCheckIn(habit, selectedDayKey, status, nowDayKey));
    persist();
    render();
    renderModal();
    showSnackbar(status === 'clean' ? 'Marked clean' : 'Marked missed');
}

function updateJournalText() {
    if (!openHabitId) {
        return;
    }

    clearTimeout(journalDebounceTimer);
    journalDebounceTimer = setTimeout(() => {
        journalDebounceTimer = null;
        commitJournalText();
    }, JOURNAL_DEBOUNCE_MS);
}

function renderList(habits, targetList, emptyMessage) {
    targetList.innerHTML = '';
    if (!habits.length) {
        const item = document.createElement('li');
        item.className = 'empty-state';
        item.textContent = emptyMessage;
        targetList.appendChild(item);
        return;
    }

    habits.forEach((habit) => {
        const nowDayKey = toDayKey();
        const checked = habit.statusByDate[nowDayKey] === 'clean';

        const row = document.createElement('li');
        row.className = `habit-item${checked ? ' done' : ''}`;
        row.innerHTML = `
      <input type="checkbox" class="habit-checkbox" ${checked ? 'checked' : ''} ${habit.isBroken ? 'disabled' : ''} aria-label="Mark ${escapeHtml(habit.name)} clean for today" />
      <button class="habit-name-btn" aria-label="Open details for ${escapeHtml(habit.name)}">${escapeHtml(habit.name)}</button>
      <span class="habit-streak">${habit.streak}d</span>
      <button class="icon-btn" aria-label="Delete ${escapeHtml(habit.name)}">
        <span class="material-icons">delete_outline</span>
      </button>
    `;

        row.querySelector('.habit-checkbox').addEventListener('change', (event) => {
            markTodayClean(habit.id, event.target.checked);
        });

        row.querySelector('.habit-name-btn').addEventListener('click', () => openModal(habit.id));
        row.querySelector('.icon-btn').addEventListener('click', () => deleteHabit(habit.id));

        targetList.appendChild(row);
    });
}

function render() {
    const nowDayKey = toDayKey();
    reconcileAll(nowDayKey);

    const activeHabits = state.habits.filter((habit) => !habit.isBroken);
    const archivedHabits = state.habits.filter((habit) => habit.isBroken);

    const doneToday = activeHabits.filter((habit) => habit.statusByDate[nowDayKey] === 'clean').length;

    ui.currentDate.textContent = formatTodayHeadline(nowDayKey);
    ui.progressChip.textContent = `${doneToday} / ${activeHabits.length}`;
    ui.progressBar.style.width = activeHabits.length
        ? `${Math.round((doneToday / activeHabits.length) * 100)}%`
        : '0%';

    ui.emptyState.style.display = activeHabits.length ? 'none' : 'block';
    ui.archivedSection.hidden = !archivedHabits.length;

    renderList(activeHabits, ui.habitList, 'No active habits.');
    renderList(archivedHabits, ui.archivedList, 'No archived habits.');

    persist();
}

ui.addBtn.addEventListener('click', addHabit);
ui.habitInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        addHabit();
    }
});

ui.modalClose.addEventListener('click', closeModal);
ui.modalBackdrop.addEventListener('click', (event) => {
    if (event.target === ui.modalBackdrop) {
        closeModal();
    }
});
ui.modalBackdrop.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeModal();
    }
});

ui.modalDateInput.addEventListener('change', renderModal);
ui.modalMarkClean.addEventListener('click', () => applyModalCheckIn('clean'));
ui.modalMarkMissed.addEventListener('click', () => applyModalCheckIn('missed'));
ui.modalJournal.addEventListener('input', updateJournalText);

render();
