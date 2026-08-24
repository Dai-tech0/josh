"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { FeedbackPost } from "@/lib/types";

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
    return <p className="text-slate-500 text-sm">読み込み中...</p>;
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

  // feedbackPosts は作成日時の新しい順。トップレベル投稿ごとに、その返信を古い順（会話順）でまとめる
  const topLevelPosts = feedbackPosts.filter((p) => !p.parentId);
  const repliesByParent = new Map<string, FeedbackPost[]>();
  for (const post of feedbackPosts) {
    if (!post.parentId) continue;
    const list = repliesByParent.get(post.parentId) ?? [];
    list.push(post);
    repliesByParent.set(post.parentId, list);
  }
  for (const list of repliesByParent.values()) {
    list.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">フィードバック掲示板</h1>
        <p className="text-sm text-slate-500 mt-1">
          気づいたことや要望を、どなたでも自由に書き込めます。質問には返信で会話できます。
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
          className="w-full border border-slate-400 rounded px-3 py-2 text-sm"
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
        {topLevelPosts.length === 0 && (
          <p className="text-sm text-slate-500">まだ投稿がありません。最初の投稿をしてみましょう。</p>
        )}
        {topLevelPosts.map((post) => (
          <FeedbackThread key={post.id} post={post} replies={repliesByParent.get(post.id) ?? []} />
        ))}
      </ul>
    </div>
  );
}

function PostMeta({ post }: { post: FeedbackPost }) {
  return (
    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
      <span>
        {(post.authorRole === "admin" || post.authorRole === "developer") && (
          <>{post.authorName} </>
        )}
        ({ROLE_LABEL[post.authorRole] ?? post.authorRole})
      </span>
      <span>{formatDateTime(post.createdAt)}</span>
    </div>
  );
}

function FeedbackThread({ post, replies }: { post: FeedbackPost; replies: FeedbackPost[] }) {
  const { postFeedback } = useStore();
  const [replying, setReplying] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!replyMessage.trim()) return;
    setSubmitting(true);
    try {
      await postFeedback(replyMessage, post.id);
      setReplyMessage("");
      setReplying(false);
    } catch {
      setError("返信の送信に失敗しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <li className="border border-slate-200 rounded-lg bg-white p-4 space-y-3">
      <div>
        <PostMeta post={post} />
        <p className="text-sm text-slate-800 whitespace-pre-wrap">{post.message}</p>
      </div>

      {replies.length > 0 && (
        <ul className="space-y-2 pl-3 border-l-2 border-indigo-100">
          {replies.map((reply) => (
            <li key={reply.id} className="bg-slate-50 rounded-lg p-3">
              <PostMeta post={reply} />
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{reply.message}</p>
            </li>
          ))}
        </ul>
      )}

      {replying ? (
        <form onSubmit={handleReply} className="pl-3 space-y-2">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <textarea
            required
            autoFocus
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            placeholder="返信を書く"
            rows={2}
            className="w-full border border-slate-400 rounded px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? "送信中..." : "返信する"}
            </button>
            <button
              type="button"
              onClick={() => setReplying(false)}
              className="text-xs text-slate-500 hover:underline"
            >
              キャンセル
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setReplying(true)}
          className="text-xs text-indigo-600 hover:underline pl-3"
        >
          返信する
        </button>
      )}
    </li>
  );
}
