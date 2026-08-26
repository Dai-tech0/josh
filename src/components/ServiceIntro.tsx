import { CALENDAR_STATUS_STYLE } from "@/lib/allocation";

const MINI_CALENDAR = [
  "onTrack",
  "onTrack",
  "slightlyBehind",
  "onTrack",
  "onTrack",
  "pause",
  "onTrack",
] as const;

/**
 * 初めてサイトを訪れた人に、ログインフォームの下でサービス内容を一目で伝えるための紹介セクション。
 * イメージ部分は実際の進捗カレンダーの配色をそのまま使い、雰囲気だけのイラストにしない。
 */
export default function ServiceIntro() {
  return (
    <section className="border-t border-slate-200 pt-8 mt-2">
      <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="space-y-2">
          <p className="text-lg font-bold text-slate-800">
            「あれやった？」をなくす、親子の宿題管理サービス
          </p>
          <p className="text-sm text-slate-600 leading-relaxed max-w-md">
            Yattaは、子供の宿題・学習タスクを登録するだけで日々のノルマを自動計算し、進捗をカレンダーで一目で確認できる、親子のための課題管理サービスです。子供は毎日のチェック報告だけで完了、親は「あれやった？」と聞く手間から解放されます。
          </p>
        </div>

        <div className="border border-slate-200 rounded-lg bg-white p-3 w-fit mx-auto sm:mx-0">
          <div className="grid grid-cols-7 gap-1">
            {MINI_CALENDAR.map((status, i) => (
              <div
                key={i}
                className={`w-5 h-5 rounded border ${CALENDAR_STATUS_STYLE[status]}`}
              />
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-2 text-center">今週の進捗カレンダー</p>
        </div>
      </div>
    </section>
  );
}
