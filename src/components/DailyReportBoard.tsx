"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import {
  PRIORITY_STYLE,
  buildAmountSchedule,
  buildCountSchedule,
  priorityLabel,
  sortByPriority,
  type AmountSchedule,
} from "@/lib/allocation";
import { formatDateJP, todayISO } from "@/lib/date";
import type { DailyLog, HomeworkTask } from "@/lib/types";
import QuotaCheckboxReport from "./QuotaCheckboxReport";
import StampBadge from "./StampBadge";
import FuriganaText from "./FuriganaText";

/**
 * 子供のホーム画面向け: 今日の課題を優先度順に並べ、その場で実績を登録できるボード。
 * 課題詳細ページ（過去の履歴・全期間のスケジュール確認用）とは別に、
 * 「今すぐ今日の分を報告する」導線として提供する。
 */
export default function DailyReportBoard({ childId }: { childId: string }) {
  const { getTasksOfChild, getLogsOfTask } = useStore();
  const tasks = sortByPriority(getTasksOfChild(childId));

  if (tasks.length === 0) {
    return (
      <div className="border border-slate-200 rounded-lg bg-white p-5 text-sm text-slate-500">
        <FuriganaText text="まだ課題が登録されていません。管理者（親）に課題を登録してもらいましょう。" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="font-semibold">
        {formatDateJP(todayISO())}
        <FuriganaText text="の実績を登録" />
      </h2>
      {tasks.map((task) => (
        <TaskReportRow key={task.id} task={task} logs={getLogsOfTask(task.id)} />
      ))}
    </div>
  );
}

function TaskReportRow({ task, logs }: { task: HomeworkTask; logs: DailyLog[] }) {
  return (
    <div className="border border-slate-200 rounded-lg bg-white p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_STYLE[task.priority]}`}>
          <FuriganaText text="優先度" />: {priorityLabel(task.priority)}
        </span>
        <Link href={`/tasks/${task.id}`} className="font-medium hover:text-indigo-600">
          {task.name}
        </Link>
      </div>
      {task.type === "amount" ? <AmountReportForm task={task} logs={logs} /> : <CountReportForm task={task} logs={logs} />}
    </div>
  );
}

function AmountReportForm({ task, logs }: { task: HomeworkTask; logs: DailyLog[] }) {
  const { reportLog } = useStore();
  const today = todayISO();
  const schedule = buildAmountSchedule(task, logs);
  const todayRow = schedule.rows.find((r) => r.date === today);
  const [justSubmitted, setJustSubmitted] = useState<number | null>(null);

  if (!todayRow) {
    return (
      <p className="text-xs text-slate-500">
        <FuriganaText text="今日はこの課題の期間外です。" />
      </p>
    );
  }
  if (todayRow.isPause) {
    return (
      <PauseDayQuickForm
        taskId={task.id}
        unit={task.unit}
        date={today}
        existing={todayRow.doneAmount}
      />
    );
  }

  return (
    <div className="space-y-2">
      <QuotaCheckboxReport
        key={todayRow.doneAmount ?? "unset"}
        plannedAmount={todayRow.plannedAmount}
        unit={task.unit}
        existingDoneAmount={todayRow.doneAmount}
        onSubmit={(amount) => {
          reportLog(task.id, today, amount);
          setJustSubmitted(amount);
        }}
      />
      {justSubmitted !== null && (
        <StampBadge
          size="sm"
          tier={
            justSubmitted > todayRow.plannedAmount
              ? "exceeded"
              : justSubmitted === todayRow.plannedAmount
              ? "met"
              : "missed"
          }
        />
      )}
      <RecentStamps schedule={schedule} />
    </div>
  );
}

/** これまでの実績をシールの履歴として並べる（子供のモチベーション向け） */
function RecentStamps({ schedule }: { schedule: AmountSchedule }) {
  const reported = schedule.rows.filter((r) => !r.isPause && r.tier !== null);
  const recent = reported.slice(-7);

  if (recent.length === 0) return null;

  return (
    <div className="pt-1">
      <p className="text-xs text-slate-500 mb-1">
        <FuriganaText text="これまでの記録" />
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {recent.map((r) => (
          <div key={r.date} className="flex flex-col items-center shrink-0">
            <StampBadge tier={r.tier!} size="sm" />
            <span className="text-[10px] text-slate-500 mt-0.5">{formatDateJP(r.date)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CountReportForm({ task, logs }: { task: HomeworkTask; logs: DailyLog[] }) {
  const { reportLog } = useStore();
  const today = todayISO();
  const schedule = buildCountSchedule(task, logs);
  const existing = logs.find((l) => l.date === today);
  const [amount, setAmount] = useState(existing?.doneAmount ?? 0);
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    reportLog(task.id, today, amount);
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-xs text-slate-500 mb-1">
          <FuriganaText text="今週のノルマ" />: {schedule.thisWeekQuota ?? 0}
          {task.unit}
        </label>
        <input
          type="number"
          min={0}
          value={amount}
          onChange={(e) => {
            setAmount(Number(e.target.value));
            setSaved(false);
          }}
          className="border border-slate-400 rounded px-2 py-1.5 text-sm w-24"
        />
      </div>
      <button
        type="submit"
        className="bg-indigo-600 text-white text-sm px-4 py-1.5 rounded hover:bg-indigo-700"
      >
        <FuriganaText text="報告する" />
      </button>
      {saved && (
        <span className="text-xs text-emerald-600">
          <FuriganaText text="報告しました" />
        </span>
      )}
    </form>
  );
}

function PauseDayQuickForm({
  taskId,
  unit,
  date,
  existing,
}: {
  taskId: string;
  unit: string;
  date: string;
  existing: number | null;
}) {
  const { reportLog } = useStore();
  const [amount, setAmount] = useState(existing ?? 0);
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    reportLog(taskId, date, amount);
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-xs text-slate-500 mb-1">
          <FuriganaText text="今日は休止日です。やりたい場合だけ記録できます" />（{unit}）
        </label>
        <input
          type="number"
          min={0}
          value={amount}
          onChange={(e) => {
            setAmount(Number(e.target.value));
            setSaved(false);
          }}
          className="border border-slate-400 rounded px-2 py-1.5 text-sm w-28"
        />
      </div>
      <button
        type="submit"
        className="bg-slate-600 text-white text-sm px-4 py-1.5 rounded hover:bg-slate-700"
      >
        <FuriganaText text="記録する" />
      </button>
      {saved && (
        <span className="text-xs text-indigo-500">
          <FuriganaText text="自主学習を記録しました" />
        </span>
      )}
    </form>
  );
}
