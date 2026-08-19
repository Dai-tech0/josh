// 自動配分ロジック（セクション3）
//
// 稼働日数 = 期間全体の日数 − 休止日数
// 1日あたりノルマ = 総量 ÷ 稼働日数 → 端数は切り上げ（早めに終わる方向にバッファ）
// 未達成時: やらなかった分は残り稼働日で均等に再分配
// 前倒し時: 進んだ分、残りの1日あたりノルマを均等に減らす
// 個数課題は週単位の割り当てにする

import type { AchievementTier, CustomPauseRange, DailyLog, HomeworkTask, PauseRule } from "./types";
import { addDays, dayOfWeek, eachDateInRange, isWithinRange, todayISO } from "./date";

export function ceilDiv(a: number, b: number): number {
  if (b <= 0) return a > 0 ? a : 0;
  return Math.ceil(a / b);
}

export function isPauseDay(date: string, pauseRule: PauseRule): boolean {
  if (pauseRule.weeklyDays.includes(dayOfWeek(date))) return true;
  return pauseRule.customRanges.some((r) => isWithinRange(date, r.start, r.end));
}

export interface AmountScheduleRow {
  date: string;
  isPause: boolean; // 休止日か（休止日でも記録は可能。ただしノルマは発生しない）
  plannedAmount: number; // その時点で有効な1日あたりノルマ（休止日は常に0）
  doneAmount: number | null; // null = まだ報告期限が来ていない（未来日）
  reported: boolean;
  tier: AchievementTier | null; // 実績が確定した稼働日のみ算出される評価
}

export interface AmountSchedule {
  rows: AmountScheduleRow[];
  totalWorkdays: number;
  remainingAmount: number; // 現時点で残っている総量
  remainingWorkdays: number; // 現時点以降の稼働日数
  todaysQuota: number | null; // 今日が稼働日ならそのノルマ、休止日ならnull
  isBehindSchedule: boolean; // 残稼働日数に対して残量が既に賄えない（=期間内に終わらない）
}

export function achievementTier(planned: number, done: number): AchievementTier {
  if (done > planned) return "exceeded";
  if (done === planned) return "met";
  return "missed";
}

export const ACHIEVEMENT_LABEL: Record<AchievementTier, string> = {
  exceeded: "大変よくできました",
  met: "よくできました",
  missed: "もっと頑張りましょう",
};

/**
 * 総量課題（amount型）のスケジュールを計算する。
 * 過去〜今日で報告済み/未報告(未達成扱い)の実績をもとに、残りを残り稼働日で均等に再分配していく。
 * 未来日はまだ実績が無いため、直近の（再分配後の）ノルマがそのまま繰り返し適用される。
 * 休止日も一覧には含めるが、ノルマは発生させない（記録した分だけ残量に反映する）。
 */
export function buildAmountSchedule(
  task: HomeworkTask,
  logs: DailyLog[],
  today: string = todayISO()
): AmountSchedule {
  const endDate = task.extendedEndDate ?? task.endDate;
  const allDays = eachDateInRange(task.startDate, endDate);
  const totalWorkdays = allDays.filter((d) => !isPauseDay(d, task.pauseRule)).length;
  const logMap = new Map(logs.filter((l) => l.taskId === task.id).map((l) => [l.date, l]));

  let remaining = task.totalAmount;
  let workdaysLeft = totalWorkdays;
  let currentQuota = ceilDiv(remaining, workdaysLeft);
  const rows: AmountScheduleRow[] = [];
  let todaysQuota: number | null = null;

  // 全日程を順に走査し、実績が確定した稼働日（過去または報告済み）ごとにのみ
  // 残量と残稼働日数を1日分減らして再計算する。未確定の未来日は
  // 直近で有効なノルマ（currentQuota）をそのまま引き継ぐ（再分配は実績確定時にのみ発生する）。
  // 休止日は稼働日数にカウントしないが、記録があれば残量には反映する。
  for (const date of allDays) {
    const isPause = isPauseDay(date, task.pauseRule);
    const log = logMap.get(date);
    const isPast = date < today;
    const isFinalized = isPast || !!log;

    const plannedAmount = isPause ? 0 : currentQuota;
    const doneAmount = log ? log.doneAmount : !isPause && isPast ? 0 : null;
    const tier =
      !isPause && doneAmount !== null ? achievementTier(plannedAmount, doneAmount) : null;
    rows.push({ date, isPause, plannedAmount, doneAmount, reported: !!log, tier });

    if (date === today && !isPause) todaysQuota = plannedAmount;

    if (isPause) {
      if (log) remaining = Math.max(0, remaining - log.doneAmount);
    } else if (isFinalized) {
      remaining = Math.max(0, remaining - (log ? log.doneAmount : 0));
      workdaysLeft -= 1;
      currentQuota = workdaysLeft > 0 ? ceilDiv(remaining, workdaysLeft) : remaining;
    }
  }

  const remainingWorkdays = allDays.filter((d) => d >= today && !isPauseDay(d, task.pauseRule)).length;

  return {
    rows,
    totalWorkdays,
    remainingAmount: remaining,
    remainingWorkdays,
    todaysQuota,
    isBehindSchedule: remainingWorkdays === 0 && remaining > 0,
  };
}

export interface WeekWindow {
  index: number;
  start: string;
  end: string;
}

/**
 * 課題の開始日を起点に7日単位で期間を分割する（実務的な「週」）。
 */
export function getWeekWindows(startDate: string, endDate: string): WeekWindow[] {
  const windows: WeekWindow[] = [];
  let cur = startDate;
  let index = 0;
  while (cur <= endDate) {
    const weekEnd = addDays(cur, 6);
    windows.push({ index, start: cur, end: weekEnd > endDate ? endDate : weekEnd });
    cur = addDays(cur, 7);
    index++;
  }
  return windows;
}

export interface CountScheduleRow extends WeekWindow {
  plannedCount: number;
  doneCount: number;
  isCurrentWeek: boolean;
  isPastWeek: boolean;
}

export interface CountSchedule {
  rows: CountScheduleRow[];
  totalWeeks: number;
  remainingCount: number;
  remainingWeeks: number;
  thisWeekQuota: number | null;
}

/**
 * 個数課題（count型）を週単位で均等配分する。仕組みはamount型と同じ再分配ロジックを週粒度で適用する。
 */
export function buildCountSchedule(
  task: HomeworkTask,
  logs: DailyLog[],
  today: string = todayISO()
): CountSchedule {
  const endDate = task.extendedEndDate ?? task.endDate;
  const weeks = getWeekWindows(task.startDate, endDate);
  const taskLogs = logs.filter((l) => l.taskId === task.id);

  let remaining = task.totalAmount;
  let weeksLeft = weeks.length;
  let currentQuota = ceilDiv(remaining, weeksLeft);
  const rows: CountScheduleRow[] = [];
  let thisWeekQuota: number | null = null;

  // amount型と同じ考え方: 週が完全に終了した時点でのみ残量・残週数を減らして再計算する。
  for (let i = 0; i < weeks.length; i++) {
    const w = weeks[i];
    const plannedCount = currentQuota;
    const doneCount = taskLogs
      .filter((l) => isWithinRange(l.date, w.start, w.end))
      .reduce((sum, l) => sum + l.doneAmount, 0);

    const isPastWeek = w.end < today;
    const isCurrentWeek = today >= w.start && today <= w.end;

    rows.push({ ...w, plannedCount, doneCount, isCurrentWeek, isPastWeek });

    if (isCurrentWeek) thisWeekQuota = plannedCount;

    if (isPastWeek) {
      remaining = Math.max(0, remaining - doneCount);
      weeksLeft -= 1;
      currentQuota = weeksLeft > 0 ? ceilDiv(remaining, weeksLeft) : remaining;
    }
  }

  const remainingWeeks = weeks.filter((w) => w.end >= today).length;

  return {
    rows,
    totalWeeks: weeks.length,
    remainingCount: remaining,
    remainingWeeks,
    thisWeekQuota,
  };
}

export interface ChildProgressSummary {
  achievedThisWeek: number; // 直近7日のうち、その日の課題を達成できた日数
  reportableThisWeek: number; // 直近7日のうち、実績が確定している日数
  streak: number; // 今日（または直近）から遡って連続で達成できている日数
  recentDays: { date: string; tier: AchievementTier }[]; // 直近の実績（最大5件、古い順）
}

/**
 * 家族・権限画面で子供ごとの進捗をひと目で見せるためのサマリー。
 * 総量課題（amount型）の日次実績を横断して集計する（個数課題は週単位のため対象外）。
 * ある日の評価は、その日に稼働していた課題のうち最も悪い評価を採用する
 * （1つでも未達成があれば「missed」扱い）。
 */
export function summarizeChildProgress(
  tasks: HomeworkTask[],
  logs: DailyLog[],
  today: string = todayISO()
): ChildProgressSummary {
  const amountTasks = tasks.filter((t) => t.type === "amount");
  const dateTiers = new Map<string, AchievementTier[]>();

  for (const task of amountTasks) {
    const schedule = buildAmountSchedule(task, logs, today);
    for (const row of schedule.rows) {
      if (row.isPause || row.tier === null || row.date > today) continue;
      const arr = dateTiers.get(row.date) ?? [];
      arr.push(row.tier);
      dateTiers.set(row.date, arr);
    }
  }

  function dayTier(date: string): AchievementTier | null {
    const tiers = dateTiers.get(date);
    if (!tiers || tiers.length === 0) return null;
    if (tiers.includes("missed")) return "missed";
    if (tiers.includes("exceeded")) return "exceeded";
    return "met";
  }

  let achievedThisWeek = 0;
  let reportableThisWeek = 0;
  for (let i = 0; i < 7; i++) {
    const date = addDays(today, -i);
    const tier = dayTier(date);
    if (tier === null) continue;
    reportableThisWeek++;
    if (tier !== "missed") achievedThisWeek++;
  }

  let streak = 0;
  let cursor = today;
  for (let i = 0; i < 365; i++) {
    const tier = dayTier(cursor);
    if (tier === null) {
      if (cursor === today) {
        cursor = addDays(cursor, -1);
        continue;
      }
      break;
    }
    if (tier === "missed") break;
    streak++;
    cursor = addDays(cursor, -1);
  }

  const recentDays = [...dateTiers.keys()]
    .filter((d) => d <= today)
    .sort()
    .slice(-5)
    .map((date) => ({ date, tier: dayTier(date)! }));

  return { achievedThisWeek, reportableThisWeek, streak, recentDays };
}

export function priorityLabel(p: HomeworkTask["priority"]): string {
  return { high: "高", mid: "中", low: "低" }[p];
}

export const PRIORITY_STYLE: Record<HomeworkTask["priority"], string> = {
  high: "bg-red-100 text-red-700",
  mid: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};

export function priorityWeight(p: HomeworkTask["priority"]): number {
  return { high: 0, mid: 1, low: 2 }[p];
}

export function sortByPriority(tasks: HomeworkTask[]): HomeworkTask[] {
  return [...tasks].sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority));
}

export function emptyPauseRule(): PauseRule {
  return { weeklyDays: [], customRanges: [] };
}

export function newCustomRange(label: string, start: string, end: string): CustomPauseRange {
  return { id: crypto.randomUUID(), label, start, end };
}
