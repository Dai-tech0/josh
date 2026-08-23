"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import TaskForm from "@/components/TaskForm";
import QuotaCheckboxReport from "@/components/QuotaCheckboxReport";
import StampBadge from "@/components/StampBadge";
import { PRIORITY_STYLE, buildAmountSchedule, buildCountSchedule, priorityLabel } from "@/lib/allocation";
import { formatDateJP, todayISO } from "@/lib/date";

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { hydrated, currentUser, data, getLogsOfTask, deleteTask } = useStore();
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  if (!hydrated) return <p className="text-slate-500 text-sm">読み込み中...</p>;
  if (!currentUser) {
    return (
      <div className="border border-slate-200 rounded-lg p-6 bg-white text-sm text-slate-600">
        ログインが必要です。トップページからアカウントを選んでください。
      </div>
    );
  }

  const task = data.tasks.find((t) => t.id === id);
  if (!task) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-500">課題が見つかりませんでした。</p>
        <Link href="/tasks" className="text-sm text-indigo-600 hover:underline">
          課題一覧に戻る
        </Link>
      </div>
    );
  }

  const child = data.children.find((c) => c.id === task.childId);
  const isAdminOwner = currentUser.role === "admin" && child?.adminId === currentUser.id;
  const isOwnerSelf = currentUser.role === "owner" && currentUser.id === task.childId;
  const isViewerOfChild = currentUser.role === "viewer" && currentUser.childId === task.childId;

  if (!isAdminOwner && !isOwnerSelf && !isViewerOfChild) {
    return <p className="text-sm text-slate-500">この課題を閲覧する権限がありません。</p>;
  }

  const canEdit = isAdminOwner;
  const canReport = isOwnerSelf;
  const logs = getLogsOfTask(task.id);

  async function handleDelete() {
    if (!confirm(`「${task!.name}」を削除しますか？`)) return;
    await deleteTask(task!.id);
    router.push("/tasks");
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/tasks" className="text-xs text-indigo-600 hover:underline">
          ← 課題一覧に戻る
        </Link>
      </div>

      {editing && canEdit ? (
        <div className="border border-slate-200 rounded-lg bg-white p-5">
          <h2 className="font-semibold mb-3">課題を編集</h2>
          <TaskForm childId={task.childId} initial={task} onDone={() => setEditing(false)} />
        </div>
      ) : (
        <>
          <div className="border border-slate-200 rounded-lg bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_STYLE[task.priority]}`}>
                    優先度: {priorityLabel(task.priority)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {task.type === "amount" ? "総量型（日割り）" : "個数型（週割り）"}
                  </span>
                </div>
                <h1 className="text-xl font-bold">{task.name}</h1>
                <p className="text-sm text-slate-500 mt-1">
                  {child?.name} ／ 総量 {task.totalAmount}
                  {task.unit} ／ {formatDateJP(task.startDate)} 〜{" "}
                  {formatDateJP(task.extendedEndDate ?? task.endDate)}
                </p>
                {(task.pauseRule.weeklyDays.length > 0 || task.pauseRule.customRanges.length > 0) && (
                  <p className="text-xs text-slate-500 mt-1">
                    休止日:{" "}
                    {task.pauseRule.weeklyDays
                      .map((d) => ["日", "月", "火", "水", "木", "金", "土"][d])
                      .join("・")}
                    {task.pauseRule.weeklyDays.length > 0 &&
                      task.pauseRule.customRanges.length > 0 &&
                      "、"}
                    {task.pauseRule.customRanges
                      .map((r) => `${r.label}(${r.start}〜${r.end})`)
                      .join("、")}
                  </p>
                )}
              </div>
              {canEdit && (
                <div className="flex flex-col gap-1 items-end shrink-0">
                  <button
                    onClick={() => setEditing(true)}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    編集
                  </button>
                  <button onClick={handleDelete} className="text-xs text-red-500 hover:underline">
                    削除
                  </button>
                </div>
              )}
            </div>
          </div>

          {task.type === "amount" ? (
            <AmountView task={task} logs={logs} canReport={canReport} />
          ) : (
            <CountView task={task} logs={logs} canReport={canReport} />
          )}
        </>
      )}
    </div>
  );
}

function AmountView({
  task,
  logs,
  canReport,
}: {
  task: import("@/lib/types").HomeworkTask;
  logs: import("@/lib/types").DailyLog[];
  canReport: boolean;
}) {
  const { reportLog } = useStore();
  const schedule = buildAmountSchedule(task, logs);
  const today = todayISO();
  const reportableRows = schedule.rows.filter((r) => r.date <= today && !r.isPause);
  const [reportDate, setReportDate] = useState(
    reportableRows[reportableRows.length - 1]?.date ?? today
  );
  const rowForDate = schedule.rows.find((r) => r.date === reportDate);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="残り" value={`${schedule.remainingAmount}${task.unit}`} />
        <Stat label="残り稼働日" value={`${schedule.remainingWorkdays}日`} />
        <Stat
          label="今日のノルマ"
          value={schedule.todaysQuota !== null ? `${schedule.todaysQuota}${task.unit}` : "休止日"}
          highlight
        />
      </div>

      {schedule.isBehindSchedule && (
        <p className="text-sm bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2">
          稼働日が残っていないのに未達成分が残っています。親のリカバリー操作（期間延長・ノルマ調整）が必要です。
        </p>
      )}

      {canReport && (
        <div className="border border-slate-200 rounded-lg bg-white p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">報告する日</label>
            <select
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="border border-slate-400 rounded px-2 py-1.5 text-sm bg-white"
            >
              {schedule.rows
                .filter((r) => r.date <= today)
                .map((r) => (
                  <option key={r.date} value={r.date}>
                    {formatDateJP(r.date)}
                    {r.isPause ? "（休止日）" : ""}
                  </option>
                ))}
            </select>
          </div>
          {rowForDate?.isPause ? (
            <PauseDayInlineForm
              key={reportDate}
              taskId={task.id}
              unit={task.unit}
              date={reportDate}
              existing={rowForDate.doneAmount}
            />
          ) : (
            rowForDate && (
              <QuotaCheckboxReport
                key={reportDate}
                plannedAmount={rowForDate.plannedAmount}
                unit={task.unit}
                existingDoneAmount={rowForDate.doneAmount}
                onSubmit={(amount) => reportLog(task.id, reportDate, amount)}
              />
            )
          )}
        </div>
      )}

      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs">
            <tr>
              <th className="text-left px-3 py-2 font-medium">日付</th>
              <th className="text-right px-3 py-2 font-medium">ノルマ</th>
              <th className="text-right px-3 py-2 font-medium">実績</th>
              <th className="text-right px-3 py-2 font-medium">状態</th>
            </tr>
          </thead>
          <tbody>
            {schedule.rows.map((r) => (
              <tr
                key={r.date}
                className={`border-t border-slate-100 ${r.date === today ? "bg-indigo-50" : ""} ${
                  r.isPause ? "text-slate-500" : ""
                }`}
              >
                <td className="px-3 py-1.5">
                  {formatDateJP(r.date)}
                  {r.isPause && <span className="text-xs ml-1">（休止日）</span>}
                </td>
                <td className="px-3 py-1.5 text-right">
                  {r.isPause ? "-" : `${r.plannedAmount}${task.unit}`}
                </td>
                <td className="px-3 py-1.5 text-right">
                  {r.doneAmount === null ? "-" : `${r.doneAmount}${task.unit}`}
                </td>
                <td className="px-3 py-1.5 text-right">
                  {r.isPause ? (
                    r.doneAmount !== null && r.doneAmount > 0 ? (
                      <span className="text-xs text-indigo-500">自主学習</span>
                    ) : (
                      ""
                    )
                  ) : r.tier ? (
                    <StampBadge tier={r.tier} size="sm" />
                  ) : (
                    ""
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CountView({
  task,
  logs,
  canReport,
}: {
  task: import("@/lib/types").HomeworkTask;
  logs: import("@/lib/types").DailyLog[];
  canReport: boolean;
}) {
  const { reportLog } = useStore();
  const schedule = buildCountSchedule(task, logs);
  const today = todayISO();
  const [reportDate, setReportDate] = useState(today);
  const [amount, setAmount] = useState(1);

  function handleReport(e: React.FormEvent) {
    e.preventDefault();
    reportLog(task.id, reportDate, amount);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="残り" value={`${schedule.remainingCount}${task.unit}`} />
        <Stat label="残り週数" value={`${schedule.remainingWeeks}週`} />
        <Stat
          label="今週のノルマ"
          value={schedule.thisWeekQuota !== null ? `${schedule.thisWeekQuota}${task.unit}` : "-"}
          highlight
        />
      </div>

      {canReport && (
        <form
          onSubmit={handleReport}
          className="border border-slate-200 rounded-lg bg-white p-4 flex flex-wrap items-end gap-3"
        >
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">実施した日</label>
            <input
              type="date"
              value={reportDate}
              max={today}
              min={task.startDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="border border-slate-400 rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              完了した数（{task.unit}）
            </label>
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="border border-slate-400 rounded px-2 py-1.5 text-sm w-24"
            />
          </div>
          <button
            type="submit"
            className="bg-indigo-600 text-white text-sm px-4 py-2 rounded hover:bg-indigo-700"
          >
            報告する
          </button>
        </form>
      )}

      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs">
            <tr>
              <th className="text-left px-3 py-2 font-medium">週</th>
              <th className="text-right px-3 py-2 font-medium">ノルマ</th>
              <th className="text-right px-3 py-2 font-medium">実績</th>
            </tr>
          </thead>
          <tbody>
            {schedule.rows.map((r) => (
              <tr
                key={r.index}
                className={`border-t border-slate-100 ${r.isCurrentWeek ? "bg-indigo-50" : ""}`}
              >
                <td className="px-3 py-1.5">
                  {formatDateJP(r.start)} 〜 {formatDateJP(r.end)}
                </td>
                <td className="px-3 py-1.5 text-right">
                  {r.plannedCount}
                  {task.unit}
                </td>
                <td className="px-3 py-1.5 text-right">
                  {r.isPastWeek || r.isCurrentWeek ? `${r.doneCount}${task.unit}` : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PauseDayInlineForm({
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
          休止日です。やりたい場合だけ記録できます（{unit}）
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
        記録する
      </button>
      {saved && <span className="text-xs text-indigo-500">自主学習を記録しました</span>}
    </form>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`border rounded-lg p-3 text-center ${
        highlight ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-lg font-bold ${highlight ? "text-indigo-700" : "text-slate-800"}`}>
        {value}
      </p>
    </div>
  );
}
