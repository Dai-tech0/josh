"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import {
  PRIORITY_STYLE,
  buildAmountSchedule,
  buildCountSchedule,
  priorityLabel,
  sortByPriority,
} from "@/lib/allocation";
import type { HomeworkTask } from "@/lib/types";
import { formatDateJP } from "@/lib/date";
import BatchTaskForm from "@/components/BatchTaskForm";
import TaskForm from "@/components/TaskForm";
import ProgressCalendar from "@/components/ProgressCalendar";
import FuriganaText from "@/components/FuriganaText";

export default function TasksPage() {
  const { hydrated, currentUser, data, getChildrenOfAdmin } = useStore();

  if (!hydrated) return <p className="text-slate-500 text-sm">読み込み中...</p>;
  if (!currentUser) {
    return (
      <div className="border border-slate-200 rounded-lg p-6 bg-white text-sm text-slate-600">
        ログインが必要です。トップページからアカウントを選んでください。
      </div>
    );
  }

  if (currentUser.role === "admin") {
    const children = getChildrenOfAdmin(currentUser.id);
    return <AdminTasksView childrenList={children} adminId={currentUser.id} />;
  }

  if (currentUser.role === "owner") {
    return <ChildTasksBoard childId={currentUser.id} childName={currentUser.name} canEdit={false} canReport />;
  }

  const child = data.children.find((c) => c.id === currentUser.childId);
  if (!child) return <p className="text-sm text-slate-500">対象の子供が見つかりません。</p>;
  return <ChildTasksBoard childId={child.id} childName={child.name} canEdit={false} canReport={false} />;
}

function AdminTasksView({
  childrenList,
  adminId,
}: {
  childrenList: { id: string; name: string }[];
  adminId: string;
}) {
  const [selectedId, setSelectedId] = useState(childrenList[0]?.id ?? "");

  if (childrenList.length === 0) {
    return (
      <div className="border border-slate-200 rounded-lg p-6 bg-white text-sm text-slate-600">
        まだ子供アカウントがありません。先に「家族・権限」から子供を追加してください。
      </div>
    );
  }

  const selected = childrenList.find((c) => c.id === selectedId) ?? childrenList[0];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">課題・目標管理</h1>
        <p className="text-sm text-slate-500 mt-1">課題の登録・編集は管理者（親）が行います。</p>
      </div>
      <div className="flex gap-3 flex-wrap">
        {childrenList.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedId(c.id)}
            className={`px-5 py-2.5 rounded-full text-base font-medium border-2 transition ${
              selected.id === c.id
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-600 border-slate-400 hover:border-indigo-400"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>
      <ChildTasksBoard
        childId={selected.id}
        childName={selected.name}
        canEdit
        canReport={false}
        adminId={adminId}
      />
    </div>
  );
}

function ChildTasksBoard({
  childId,
  childName,
  canEdit,
  canReport,
  adminId,
}: {
  childId: string;
  childName: string;
  canEdit: boolean;
  canReport: boolean;
  adminId?: string;
}) {
  const { getTasksOfChild, getLogsOfTask, deleteTask } = useStore();
  const [showForm, setShowForm] = useState(false);
  const tasks = sortByPriority(getTasksOfChild(childId));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">
          {childName}さん<FuriganaText text="の課題一覧（優先度順）" />
        </h2>
        {canEdit && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700"
          >
            {showForm ? "閉じる" : <FuriganaText text="＋ 課題を登録" />}
          </button>
        )}
      </div>

      {canEdit && showForm && adminId && (
        <TaskFormLazy childId={childId} adminId={adminId} onDone={() => setShowForm(false)} />
      )}

      <ProgressCalendar childId={childId} />

      {tasks.length === 0 && (
        <p className="text-sm text-slate-500">まだ課題が登録されていません。</p>
      )}

      <ul className="space-y-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            canEdit={canEdit}
            canReport={canReport}
            logs={getLogsOfTask(task.id)}
            onDelete={() => deleteTask(task.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function TaskFormLazy({
  childId,
  adminId,
  onDone,
}: {
  childId: string;
  adminId: string;
  onDone: () => void;
}) {
  const { getFamilyDefaults } = useStore();
  return (
    <div className="border border-slate-200 rounded-lg bg-white p-5">
      <BatchTaskForm childId={childId} defaults={getFamilyDefaults(adminId)} onDone={onDone} />
    </div>
  );
}

function TaskCard({
  task,
  canEdit,
  canReport,
  logs,
  onDelete,
}: {
  task: HomeworkTask;
  canEdit: boolean;
  canReport: boolean;
  logs: ReturnType<typeof useStore>["data"]["logs"];
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);

  const summary = useMemo(() => {
    if (task.type === "amount") {
      const s = buildAmountSchedule(task, logs);
      return `本日のノルマ: ${s.todaysQuota ?? "休止日"}${task.unit} ／ 残り ${s.remainingAmount}${task.unit}（残り稼働日 ${s.remainingWorkdays}日）`;
    }
    const s = buildCountSchedule(task, logs);
    return `今週のノルマ: ${s.thisWeekQuota ?? 0}${task.unit} ／ 残り ${s.remainingCount}${task.unit}（残り${s.remainingWeeks}週）`;
  }, [task, logs]);

  if (editing) {
    return (
      <li className="border border-indigo-200 rounded-lg bg-white p-4">
        <p className="text-xs font-medium text-slate-500 mb-3">「{task.name}」を編集</p>
        <TaskForm childId={task.childId} initial={task} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="border border-slate-200 rounded-lg bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_STYLE[task.priority]}`}>
              <FuriganaText text="優先度" />: {priorityLabel(task.priority)}
            </span>
            <span className="text-xs text-slate-500">
              {task.type === "amount" ? "総量型（日割り）" : "個数型（週割り）"}
            </span>
          </div>
          <Link href={`/tasks/${task.id}`} className="font-medium hover:text-indigo-600">
            {task.name}
          </Link>
          <p className="text-xs text-slate-500 mt-0.5">
            {task.totalAmount}
            {task.unit} ／ {formatDateJP(task.startDate)} 〜 {formatDateJP(task.endDate)}
          </p>
          <p className="text-sm text-indigo-700 mt-1">{summary}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Link
            href={`/tasks/${task.id}`}
            className="text-xs text-indigo-600 hover:underline whitespace-nowrap"
          >
            <FuriganaText text={canReport ? "報告する" : "詳細を見る"} />
          </Link>
          {canEdit && (
            <>
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-indigo-600 hover:underline"
              >
                編集
              </button>
              <button onClick={onDelete} className="text-xs text-red-500 hover:underline">
                削除
              </button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}
