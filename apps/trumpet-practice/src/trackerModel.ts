/** Implements Practice Stars state persistence and calendar calculations. */
import {
  addDays,
  compareDateKeys,
  eachDate,
  monthName,
  mostRecentMondayBeforeYesterday,
  parseDateKey,
  todayKey,
  weekdayIndex,
} from "./dateUtils";
import type {
  CalendarDay,
  DateKey,
  DayRecord,
  DayState,
  DerivedStats,
  TrackerState,
} from "./types";

export const STORAGE_KEY = "practice-stars:v1";

export function loadTrackerState(): TrackerState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as TrackerState;
  } catch {
    return null;
  }
}

export function saveTrackerState(state: TrackerState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function createInitialState(args: {
  userName: string;
  taskId: string;
  taskName: string;
  imageVersion: string;
  applauseVersion: string;
}): TrackerState {
  return {
    user_name: args.userName.trim(),
    task_id: args.taskId,
    task_name: args.taskName.trim(),
    start_date: mostRecentMondayBeforeYesterday(),
    records: {},
    image_version: args.imageVersion,
    applause_version: args.applauseVersion,
  };
}

export function dayState(record: DayRecord | undefined): DayState {
  if (record === null) {
    return "skip";
  }
  if (typeof record === "string") {
    return "done";
  }
  return "fail";
}

export function calculateStats(
  records: Record<DateKey, DayRecord>,
  startDate: DateKey,
  currentDate = todayKey(),
): DerivedStats {
  let longest = 0;
  let activeLength = 0;
  let hasDoneInActiveRun = false;

  for (const date of eachDate(startDate, currentDate)) {
    const state = dayState(records[date]);
    if (state === "fail") {
      if (hasDoneInActiveRun) {
        longest = Math.max(longest, activeLength);
      }
      activeLength = 0;
      hasDoneInActiveRun = false;
      continue;
    }

    activeLength += 1;
    if (state === "done") {
      hasDoneInActiveRun = true;
      longest = Math.max(longest, activeLength);
    }
  }

  const todayState = dayState(records[currentDate]);
  const current_streak =
    todayState === "done" && hasDoneInActiveRun ? activeLength : 0;

  return {
    current_date: currentDate,
    longest_streak: longest,
    current_streak,
  };
}

export function buildCalendarDays(
  state: TrackerState,
  currentDate = todayKey(),
): CalendarDay[] {
  return eachDate(state.start_date, currentDate).map((date) => {
    const record = state.records[date];
    return {
      date,
      dayOfMonth: parseDateKey(date).getDate(),
      monthName: monthName(date),
      startsMonth:
        parseDateKey(date).getDate() === 1 || date === state.start_date,
      state: dayState(record),
      imageName: typeof record === "string" ? record : undefined,
    };
  });
}

export function doneDatesInOrder(state: TrackerState): DateKey[] {
  return Object.entries(state.records)
    .filter(([, record]) => typeof record === "string")
    .map(([date]) => date)
    .sort(compareDateKeys);
}

export function chooseRewardImage(
  imageNames: string[],
  records: Record<DateKey, DayRecord>,
): string | null {
  if (imageNames.length === 0) {
    return null;
  }

  const used = new Set(
    Object.values(records).filter(
      (record): record is string => typeof record === "string",
    ),
  );
  const unused = imageNames.filter((name) => !used.has(name));
  if (unused.length > 0) {
    return randomItem(unused);
  }

  const doneImageNames = Object.entries(records)
    .flatMap(([date, record]) =>
      typeof record === "string" ? [[date, record] as const] : [],
    )
    .sort(([left], [right]) => compareDateKeys(left, right))
    .map(([, record]) => record);
  const recentCount = Math.floor(imageNames.length * 0.7);
  const recent = new Set(doneImageNames.slice(-recentCount));
  const eligible = imageNames.filter((name) => !recent.has(name));
  return randomItem(eligible.length > 0 ? eligible : imageNames);
}

export function setDayRecord(
  state: TrackerState,
  date: DateKey,
  record: DayRecord | undefined,
): TrackerState {
  const records = { ...state.records };
  if (record === undefined) {
    delete records[date];
  } else {
    records[date] = record;
  }
  return { ...state, records };
}

export function dateGridColumn(date: DateKey): number {
  return weekdayIndex(date) + 1;
}

export function buttonAreaColumn(
  startDate: DateKey,
  currentDate: DateKey,
): number {
  return (
    weekdayIndex(addDays(currentDate, 1)) + 1 || weekdayIndex(startDate) + 1
  );
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
