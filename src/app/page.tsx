"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { ACHIEVEMENT_LABEL, buildAmountSchedule } from "@/lib/allocation";
import { formatDateJP } from "@/lib/date";
import { Suspense, useState } from "react";
import DailyReportBoard from "@/components/DailyReportBoard";
import AuthGate from "@/components/AuthGate";
import DevDashboard from "@/components/DevDashboard";
import ServiceIntro from "@/components/ServiceIntro";
import GrowCastBanner from "@/components/GrowCastBanner";
import ReferralBanner from "@/components/ReferralBanner";

const ROLE_LABEL: Record<string, string> = {
  admin: "管理者（親）",
  owner: "オーナー（子供）",
  viewer: "共有者（評価者）",
};

export default function Home() {
  const { hydrated, currentUser, isDeveloper, needsAdminProfile } = useStore();

  if (!hydrated) {
    return <p className="text-slate-500 text-sm">読み込み中...</p>;
  }

  if (needsAdminProfile) {
    return <CompleteAdminProfile />;
  }

  if (!currentUser) {
    return (
      <div className="space-y-8">
        <Suspense fallback={<p className="text-slate-500 text-sm">読み込み中...</p>}>
          <AuthGate />
        </Suspense>
        <ServiceIntro />
        <GrowCastBanner size="sm" />
      </div>
    );
  }

  if (isDeveloper) {
    return <DevDashboard />;
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
      {currentUser.role === "admin" && <ReferralBanner />}
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
      <GrowCastBanner size={currentUser.role === "owner" ? "kid" : "lg"} />
    </div>
  );
}

function CompleteAdminProfile() {
  const { finishAdminProfile, currentUserId } = useStore();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await finishAdminProfile(trimmed);
    } catch {
      setError("登録に失敗しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 max-w-sm">
      <div>
        <h1 className="text-xl font-bold">はじめまして！</h1>
        <p className="text-sm text-slate-500 mt-1">
          メールでのログインが確認できました。最後にお名前を教えてください。
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">お名前</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 山田 花子"
            className="w-full border border-slate-400 rounded px-3 py-2 text-sm"
            key={currentUserId}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="bg-indigo-600 text-white text-sm px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? "登録中..." : "はじめる"}
        </button>
      </form>
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
