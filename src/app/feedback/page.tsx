"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";

const ROLE_LABEL: Record<string, string> = {
  admin: "管理者（親）",
  owner: "オーナー（子供）",
  viewer: "共有者",
  developer: "開発者",
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FeedbackPage() {
  const { hydrated, currentUser, currentUserId, isDeveloper, feedbackPosts, postFeedback } =
    useStore();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hydrated) {
    return <p className="text-slate-400 text-sm">読み込み中...</p>;
  }

  if (!currentUser && !isDeveloper && !currentUserId) {
    return (
      <div className="border border-slate-200 rounded-lg p-6 bg-white text-sm text-slate-600">
        ログインが必要です。トップページからログインしてください。
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      await postFeedback(message);
      setMessage("");
    } catch {
      setError("送信に失敗しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">フィードバック掲示板</h1>
        <p className="text-sm text-slate-500 mt-1">
          気づいたことや要望を、どなたでも自由に書き込めます。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="border border-slate-200 rounded-lg bg-white p-5 space-y-3">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="使ってみた感想や、こうだったらいいなと思うことを書いてください"
          rows={3}
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={submitting}
          className="bg-indigo-600 text-white text-sm px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? "送信中..." : "投稿する"}
        </button>
      </form>

      <ul className="space-y-3">
        {feedbackPosts.length === 0 && (
          <p className="text-sm text-slate-400">まだ投稿がありません。最初の投稿をしてみましょう。</p>
        )}
        {feedbackPosts.map((post) => (
          <li key={post.id} className="border border-slate-200 rounded-lg bg-white p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>
                {(post.authorRole === "admin" || post.authorRole === "developer") && (
                  <>{post.authorName} </>
                )}
                ({ROLE_LABEL[post.authorRole] ?? post.authorRole})
              </span>
              <span>{formatDateTime(post.createdAt)}</span>
            </div>
            <p className="text-sm text-slate-800 whitespace-pre-wrap">{post.message}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
