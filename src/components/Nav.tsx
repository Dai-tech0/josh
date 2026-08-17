"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";

const ROLE_LABEL: Record<string, string> = {
  admin: "管理者（親）",
  owner: "オーナー（子供）",
  viewer: "共有者",
};

export default function Nav() {
  const { hydrated, data, currentUser, currentUserId, login } = useStore();

  if (!hydrated) {
    return (
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <Link href="/" className="font-bold text-lg tracking-tight text-indigo-600">
            YATTANE
          </Link>
        </div>
      </header>
    );
  }

  const allUsers = [...data.admins, ...data.children, ...data.sharers];

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <Link href="/" className="font-bold text-lg tracking-tight text-indigo-600">
          YATTANE
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {currentUser && (
            <>
              <Link href="/family" className="text-slate-600 hover:text-indigo-600">
                家族・権限
              </Link>
              <Link href="/tasks" className="text-slate-600 hover:text-indigo-600">
                課題・目標
              </Link>
              <span className="hidden sm:inline text-slate-300">|</span>
            </>
          )}
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            アカウント切替
            <select
              value={currentUserId ?? ""}
              onChange={(e) => login(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-sm bg-white text-slate-700"
            >
              {!currentUserId && (
                <option value="" disabled>
                  選択してください
                </option>
              )}
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}（{ROLE_LABEL[u.role]}）
                </option>
              ))}
            </select>
          </label>
        </nav>
      </div>
    </header>
  );
}
