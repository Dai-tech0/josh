"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { ACHIEVEMENT_LABEL, buildAmountSchedule } from "@/lib/allocation";
import { formatDateJP } from "@/lib/date";
import DailyReportBoard from "@/components/DailyReportBoard";

const ROLE_LABEL: Record<string, string> = {
  admin: "管理者（親）",
  owner: "オーナー（子供）",
  viewer: "共有者（評価者）",
};

export default function Home() {
  const { hydrated, data, currentUser, login } = useStore();

  if (!hydrated) {
    return <p className="text-slate-400 text-sm">読み込み中...</p>;
  }

  if (!currentUser) {
    const allUsers = [...data.admins, ...data.children, ...data.sharers];
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold">ログイン（デモ用アカウント選択）</h1>
          <p className="text-sm text-slate-500 mt-1">
            本実装では認証基盤（Firebase / Supabase等）を利用予定です。まずは動作確認用に、
            役割を選んでログインしてください。
          </p>
        </div>
        <ul className="space-y-2">
          {allUsers.map((u) => (
            <li key={u.id}>
              <button
                onClick={() => login(u.id)}
                className="w-full text-left border border-slate-200 rounded-lg px-4 py-3 bg-white hover:border-indigo-400 hover:bg-indigo-50 transition flex items-center justify-between"
              >
                <span className="font-medium">{u.name}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                  {ROLE_LABEL[u.role]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">こんにちは、{currentUser.name}さん</h1>
        <p className="text-sm text-slate-500 mt-1">
          役割: {ROLE_LABEL[currentUser.role]}
        </p>
      </div>
      {currentUser.role === "admin" && <AdminAlerts adminId={currentUser.id} />}
      {currentUser.role === "owner" && <DailyReportBoard childId={currentUser.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/family"
          className="block border border-slate-200 rounded-lg p-5 bg-white hover:border-indigo-400 transition"
        >
          <h2 className="font-semibold">家族・権限管理</h2>
          <p className="text-sm text-slate-500 mt-1">
            子供アカウントの追加、共有者（応援してくれる人）の管理を行います。
          </p>
        </Link>
        <Link
          href="/tasks"
          className="block border border-slate-200 rounded-lg p-5 bg-white hover:border-indigo-400 transition"
        >
          <h2 className="font-semibold">課題・目標管理</h2>
          <p className="text-sm text-slate-500 mt-1">
            課題の登録、自動配分されたノルマの確認、日々の報告を行います。
          </p>
        </Link>
      </div>
    </div>
  );
}

interface AlertItem {
  taskId: string;
  taskName: string;
  childName: string;
  date: string;
  tier: "exceeded" | "missed";
}

function AdminAlerts({ adminId }: { adminId: string }) {
  const { getChildrenOfAdmin, getTasksOfChild, getLogsOfTask } = useStore();
  const children = getChildrenOfAdmin(adminId);

  const alerts: AlertItem[] = [];
  for (const child of children) {
    for (const task of getTasksOfChild(child.id).filter((t) => t.type === "amount")) {
      const schedule = buildAmountSchedule(task, getLogsOfTask(task.id));
      for (const row of schedule.rows) {
        if (!row.isPause && row.reported && (row.tier === "exceeded" || row.tier === "missed")) {
          alerts.push({
            taskId: task.id,
            taskName: task.name,
            childName: child.name,
            date: row.date,
            tier: row.tier,
          });
        }
      }
    }
  }
  alerts.sort((a, b) => (a.date < b.date ? 1 : -1));
  const recent = alerts.slice(0, 8);

  if (recent.length === 0) return null;

  return (
    <div className="border border-slate-200 rounded-lg bg-white p-5">
      <h2 className="font-semibold mb-3">お知らせ</h2>
      <ul className="space-y-2">
        {recent.map((a, i) => (
          <li key={i} className="flex items-center justify-between text-sm">
            <Link href={`/tasks/${a.taskId}`} className="hover:text-indigo-600">
              {formatDateJP(a.date)} {a.childName}さん「{a.taskName}」
            </Link>
            <span
              className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                a.tier === "exceeded"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {ACHIEVEMENT_LABEL[a.tier]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
