"use client";

import { useStore } from "@/lib/store";
import Link from "next/link";

/**
 * 親のホーム画面に置く、友達紹介への軽い誘導バナー。詳細（コピー・LINE送信）は家族・権限ページにある。
 * まだ子供を1人も登録していない（＝Yattaの価値をまだ体験していない）段階では、
 * 紹介を促すのは早すぎるため表示しない。
 */
export default function ReferralBanner() {
  const { myReferralCode, referralCount, currentUser, getChildrenOfAdmin } = useStore();

  const hasChildren =
    currentUser?.role === "admin" && getChildrenOfAdmin(currentUser.id).length > 0;

  if (!myReferralCode || !hasChildren) return null;

  return (
    <Link
      href="/family"
      className="flex items-center gap-3 border border-indigo-200 rounded-lg bg-indigo-50 px-4 py-3 hover:border-indigo-400 transition"
    >
      <span className="text-xl shrink-0">📣</span>
      <p className="flex-1 min-w-0 text-sm text-indigo-900">
        <span className="font-bold">お友達にYattaを紹介</span>
        しませんか？
        {referralCount > 0 && (
          <span className="text-indigo-600"> これまで{referralCount}人が登録しました</span>
        )}
      </p>
      <span className="text-xs font-medium text-white bg-indigo-600 rounded-full px-3 py-1.5 shrink-0 whitespace-nowrap">
        紹介する →
      </span>
    </Link>
  );
}
