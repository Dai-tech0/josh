"use client";

import { useStore } from "@/lib/store";
import DevDashboard from "@/components/DevDashboard";

export default function DevPage() {
  const { hydrated, currentUser, isDeveloper } = useStore();

  if (!hydrated) return <p className="text-slate-500 text-sm">読み込み中...</p>;
  if (!currentUser) {
    return (
      <div className="border border-slate-200 rounded-lg p-6 bg-white text-sm text-slate-600">
        ログインが必要です。トップページからログインしてください。
      </div>
    );
  }
  if (!isDeveloper) {
    return <p className="text-sm text-slate-500">このページを見る権限がありません。</p>;
  }

  return <DevDashboard />;
}
