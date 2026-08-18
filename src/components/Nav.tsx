"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";

const ROLE_LABEL: Record<string, string> = {
  admin: "管理者（親）",
  owner: "オーナー（子供）",
  viewer: "共有者",
};

export default function Nav() {
  const { hydrated, currentUser, logout } = useStore();

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

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <Link href="/" className="font-bold text-lg tracking-tight text-indigo-600">
          YATTANE
        </Link>
        {currentUser && (
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/family" className="text-slate-600 hover:text-indigo-600">
              家族・権限
            </Link>
            <Link href="/tasks" className="text-slate-600 hover:text-indigo-600">
              課題・目標
            </Link>
            <span className="hidden sm:inline text-slate-300">|</span>
            <span className="hidden sm:inline text-slate-500">
              {currentUser.name}
              <span className="ml-1 text-xs text-slate-400">({ROLE_LABEL[currentUser.role]})</span>
            </span>
            <button
              onClick={() => logout()}
              className="text-slate-500 hover:text-red-500 underline underline-offset-2"
            >
              ログアウト
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
