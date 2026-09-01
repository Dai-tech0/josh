import Link from "next/link";
import FuriganaText from "./FuriganaText";

/** テスト運用期間中、ホーム画面から気軽にフィードバックを送ってもらうための誘導バナー */
export default function FeedbackPrompt() {
  return (
    <Link
      href="/feedback"
      className="flex items-center gap-3 border border-amber-200 rounded-lg bg-amber-50 px-4 py-3 hover:border-amber-400 transition"
    >
      <span className="text-xl shrink-0">💬</span>
      <p className="flex-1 min-w-0 text-sm text-amber-900">
        <span className="font-bold">
          <FuriganaText text="使ってみてどうでしたか？" />
        </span>
        {" "}
        <FuriganaText text="気づいたこと・要望があれば、ぜひ教えてください" />
      </p>
      <span className="text-xs font-medium text-white bg-amber-500 rounded-full px-3 py-1.5 shrink-0 whitespace-nowrap">
        <FuriganaText text="意見を送る →" />
      </span>
    </Link>
  );
}
