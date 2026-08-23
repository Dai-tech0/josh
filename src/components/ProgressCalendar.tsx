"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import {
  ACHIEVEMENT_LABEL,
  CALENDAR_STATUS_LABEL,
  CALENDAR_STATUS_STYLE,
  buildAmountSchedule,
  buildChildCalendar,
  sortByPriority,
} from "@/lib/allocation";
import {
  addMonths,
  dayOfWeek,
  endOfMonth,
  formatDateJP,
  monthLabelJP,
  startOfMonth,
  todayISO,
} from "@/lib/date";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const LEGEND_STATUSES = ["onTrack", "slightlyBehind", "quiteBehind", "pause"] as const;
const TIER_DOT: Record<string, string> = {
  exceeded: "bg-emerald-500",
  met: "bg-emerald-500",
  missed: "bg-red-400",
};

/**
 * 期間中の進捗を月カレンダー形式で一目で見せる。
 * 「だいぶ遅れています」は遅延アラートと同じ基準（3日連続未達成）で判定する。
 */
export default function ProgressCalendar({ childId }: { childId: string }) {
  const { getTasksOfChild, getLogsOfTask } = useStore();
  const [expanded, setExpanded] = useState(true);
  const [monthAnchor, setMonthAnchor] = useState(todayISO());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const tasks = sortByPriority(getTasksOfChild(childId));
  const logs = useMemo(
    () => tasks.flatMap((t) => getLogsOfTask(t.id)),
    [tasks, getLogsOfTask]
  );

  const rangeStart = startOfMonth(monthAnchor);
  const rangeEnd = endOfMonth(monthAnchor);
  const days = useMemo(
    () => buildChildCalendar(tasks, logs, rangeStart, rangeEnd),
    [tasks, logs, rangeStart, rangeEnd]
  );
  const leadingBlanks = dayOfWeek(rangeStart);

  const selectedDetails = useMemo(() => {
    if (!selectedDate) return [];
    return tasks
      .filter(
        (t) =>
          t.type === "amount" &&
          selectedDate >= t.startDate &&
          selectedDate <= (t.extendedEndDate ?? t.endDate)
      )
      .map((t) => {
        const schedule = buildAmountSchedule(t, logs);
        const row = schedule.rows.find((r) => r.date === selectedDate);
        return row ? { task: t, row } : null;
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);
  }, [selectedDate, tasks, logs]);

  return (
    <section className="border border-slate-200 rounded-lg bg-white p-4 space-y-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between text-left"
      >
        <h2 className="font-semibold text-sm">
          {expanded ? "▼" : "▶"} 進捗カレンダー
        </h2>
        <span className="text-xs text-indigo-600 hover:underline">
          {expanded ? "非表示にする" : "表示する"}
        </span>
      </button>

      {expanded && (
        <>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMonthAnchor((m) => addMonths(m, -1))}
              className="text-xs text-slate-500 hover:text-indigo-600 px-2 py-1"
            >
              ← 前の月
            </button>
            <p className="text-sm font-medium">{monthLabelJP(monthAnchor)}</p>
            <button
              type="button"
              onClick={() => setMonthAnchor((m) => addMonths(m, 1))}
              className="text-xs text-slate-500 hover:text-indigo-600 px-2 py-1"
            >
              次の月 →
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="text-xs text-slate-600 font-semibold py-1">
                {label}
              </div>
            ))}
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}
            {days.map((d) => {
              const dayNum = Number(d.date.slice(-2));
              const clickable = d.status !== "future";
              const isSelected = d.date === selectedDate;
              return (
                <button
                  key={d.date}
                  type="button"
                  disabled={!clickable}
                  title={CALENDAR_STATUS_LABEL[d.status]}
                  onClick={() => setSelectedDate((cur) => (cur === d.date ? null : d.date))}
                  className={`aspect-square rounded-lg border-2 text-base flex items-center justify-center transition ${CALENDAR_STATUS_STYLE[d.status]} ${
                    clickable ? "active:scale-95" : "cursor-default"
                  } ${isSelected ? "ring-2 ring-indigo-500 ring-offset-1" : ""}`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-slate-100">
            {LEGEND_STATUSES.map((status) => (
              <span key={status} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span
                  className={`inline-block w-3 h-3 rounded border ${CALENDAR_STATUS_STYLE[status]}`}
                />
                {CALENDAR_STATUS_LABEL[status]}
              </span>
            ))}
          </div>

          {selectedDate && (
            <div className="border border-indigo-100 bg-indigo-50/50 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium">{formatDateJP(selectedDate)}</p>
              {selectedDetails.length === 0 ? (
                <p className="text-xs text-slate-500">この日は対象の課題がありません。</p>
              ) : (
                <ul className="space-y-1.5">
                  {selectedDetails.map(({ task, row }) => (
                    <li key={task.id} className="flex items-center justify-between text-sm">
                      <Link href={`/tasks/${task.id}`} className="hover:text-indigo-600 truncate">
                        {task.name}
                      </Link>
                      <span className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0 ml-2">
                        {row.isPause ? (
                          "休止日"
                        ) : (
                          <>
                            <span
                              className={`inline-block w-2 h-2 rounded-full ${row.tier ? TIER_DOT[row.tier] : "bg-slate-300"}`}
                            />
                            {row.doneAmount ?? 0}/{row.plannedAmount}
                            {task.unit}
                            {row.tier && (
                              <span className="text-slate-500">（{ACHIEVEMENT_LABEL[row.tier]}）</span>
                            )}
                          </>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
