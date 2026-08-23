"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import Logo from "@/components/Logo";
import FuriganaText from "@/components/FuriganaText";

const ROLE_LABEL: Record<string, string> = {
  admin: "管理者（親）",
  owner: "オーナー（子供）",
  viewer: "共有者",
};

export default function Nav() {
  const {
    hydrated,
    currentUser,
    currentUserId,
    isDeveloper,
    isSharedDevice,
    selectChild,
    logout,
    knownCodeAccounts,
    loginWithCode,
  } = useStore();

  if (!hydrated) {
    return (
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" aria-label="Yatta">
            <Logo className="h-7 w-auto" />
          </Link>
          <Link href="/guide" className="text-sm text-slate-500 hover:text-indigo-600">
            使い方ガイド
          </Link>
        </div>
      </header>
    );
  }

  const isCodeAccount =
    !isSharedDevice && (currentUser?.role === "owner" || currentUser?.role === "viewer");
  const currentCode = knownCodeAccounts.find((a) => a.name === currentUser?.name)?.code;
  const switchableAccounts = isCodeAccount
    ? knownCodeAccounts.filter((a) => a.code !== currentCode)
    : [];

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Link href="/" aria-label="Yatta">
            <Logo className="h-7 w-auto" />
          </Link>
          {!currentUserId && (
            <span className="text-xs text-slate-500">親子で宿題を管理するサービス</span>
          )}
        </div>
        {!currentUserId && (
          <nav className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/?tab=signup" className="hover:text-indigo-600">
              保護者 新規登録
            </Link>
            <span className="text-slate-300">/</span>
            <Link href="/?tab=code" className="hover:text-indigo-600">
              子供コードでログイン
            </Link>
          </nav>
        )}
        <Link href="/guide" className="text-sm text-slate-500 hover:text-indigo-600">
          使い方ガイド
        </Link>
        {(currentUser || isDeveloper || isSharedDevice || currentUserId) && (
          <nav className="flex items-center gap-3 text-sm">
            {currentUser && (
              <>
                <Link href="/family" className="text-slate-600 hover:text-indigo-600">
                  <FuriganaText text="家族・権限" />
                </Link>
                <Link href="/tasks" className="text-slate-600 hover:text-indigo-600">
                  <FuriganaText text="課題・目標" />
                </Link>
              </>
            )}
            <Link href="/feedback" className="text-slate-600 hover:text-indigo-600">
              フィードバック
            </Link>
            {isDeveloper && (
              <Link href="/dev" className="text-slate-600 hover:text-indigo-600">
                開発者
              </Link>
            )}
            <span className="hidden sm:inline text-slate-300">|</span>
            {currentUser && (
              <span className="hidden sm:inline text-slate-500">
                {currentUser.name}
                {!isSharedDevice && (
                  <span className="ml-1 text-xs text-slate-500">
                    ({ROLE_LABEL[currentUser.role]})
                  </span>
                )}
              </span>
            )}
            {isSharedDevice && currentUser && (
              <button
                onClick={() => selectChild(null)}
                className="text-xs text-indigo-600 hover:underline whitespace-nowrap"
              >
                他の子供に切替
              </button>
            )}
            {switchableAccounts.length > 0 && (
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) loginWithCode(e.target.value);
                }}
                className="border border-slate-400 rounded px-2 py-1 text-xs bg-white text-slate-600"
              >
                <option value="">他のアカウントに切替</option>
                {switchableAccounts.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.name}（{a.role === "owner" ? "子供" : "共有者"}）
                  </option>
                ))}
              </select>
            )}
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
