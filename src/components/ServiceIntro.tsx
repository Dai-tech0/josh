import { CALENDAR_STATUS_STYLE } from "@/lib/allocation";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

// サンプル月（21日始まり）の1〜2週目。実際の進捗カレンダーと同じ配色を使う
const MINI_CALENDAR: { day: number; status: keyof typeof CALENDAR_STATUS_STYLE }[] = [
  { day: 17, status: "onTrack" },
  { day: 18, status: "onTrack" },
  { day: 19, status: "slightlyBehind" },
  { day: 20, status: "onTrack" },
  { day: 21, status: "quiteBehind" },
  { day: 22, status: "pause" },
  { day: 23, status: "onTrack" },
  { day: 24, status: "onTrack" },
  { day: 25, status: "onTrack" },
  { day: 26, status: "slightlyBehind" },
  { day: 27, status: "onTrack" },
  { day: 28, status: "pause" },
  { day: 29, status: "onTrack" },
  { day: 30, status: "onTrack" },
];

/**
 * 初めてサイトを訪れた人に、ログインフォームの下でサービス内容を一目で伝えるための紹介セクション。
 * イメージ部分は実際の進捗カレンダーの配色をそのまま使い、雰囲気だけのイラストにしない。
 */
export default function ServiceIntro() {
  return (
    <section className="border-t border-slate-200 pt-8 mt-2">
      <div className="grid gap-8 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="space-y-3">
          <p className="text-lg font-bold text-slate-800">
            「あれやった？」をなくす、親子の宿題管理サービス
          </p>
          <p className="text-sm text-slate-600 leading-relaxed max-w-md">
            Yattaは、子供の宿題・学習タスクを登録するだけで
            <strong className="text-indigo-700 font-bold">日々のノルマを自動計算</strong>
            し、
            <strong className="text-indigo-700 font-bold">進捗をカレンダーで一目で確認</strong>
            できる、親子のための課題管理サービスです。子供は
            <strong className="text-slate-800 font-bold">毎日のチェック報告だけ</strong>
            で完了、親は「あれやった？」と聞く手間から解放されます。
          </p>
        </div>

        <div className="border border-slate-200 rounded-lg bg-white p-4 w-fit mx-auto sm:mx-0">
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="text-[9px] text-slate-500 font-semibold w-7">
                {label}
              </div>
            ))}
            {MINI_CALENDAR.map((d, i) => (
              <div
                key={i}
                className={`w-7 h-7 rounded border-2 text-[11px] flex items-center justify-center ${CALENDAR_STATUS_STYLE[d.status]}`}
              >
                {d.day}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-2 text-center">進捗カレンダー（イメージ）</p>
        </div>
      </div>
    </section>
  );
}
