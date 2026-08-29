import { CALENDAR_STATUS_LABEL, CALENDAR_STATUS_STYLE } from "@/lib/allocation";

export const metadata = {
  title: "使い方ガイド - Yatta",
};

const CALENDAR_LEGEND_STATUSES = [
  "onTrack",
  "slightlyBehind",
  "quiteBehind",
  "pause",
  "pauseRecorded",
] as const;

/** ステップの流れを、番号付きアイコン→矢印で一目で見せる図 */
function StepFlow({ steps }: { steps: { emoji: string; label: string }[] }) {
  return (
    <div className="flex items-start flex-wrap gap-x-1 gap-y-4">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start">
          <div className="flex flex-col items-center gap-1.5 w-[4.5rem] text-center">
            <div className="w-11 h-11 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-lg relative shrink-0">
              {step.emoji}
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                {i + 1}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-tight">{step.label}</p>
          </div>
          {i < steps.length - 1 && (
            <span className="text-slate-300 text-lg shrink-0 mt-3 px-1">→</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function GuidePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">使い方ガイド</h1>
        <p className="text-sm text-slate-500 mt-1">かんたん3ステップで始められます。</p>
      </div>

      <section className="border border-slate-200 rounded-lg bg-white p-5 space-y-4">
        <h2 className="font-semibold">保護者の方</h2>
        <StepFlow
          steps={[
            { emoji: "✉️", label: "メールで新規登録" },
            { emoji: "🧒", label: "子供を追加" },
            { emoji: "📚", label: "課題を登録" },
            { emoji: "📈", label: "ノルマ自動計算" },
          ]}
        />
        <ol className="list-decimal list-inside text-sm text-slate-700 space-y-2">
          <li>トップページの「保護者 新規登録」からメールアドレスで登録します。</li>
          <li>「家族・権限」ページから子供を追加すると、ログインコード(6文字)が発行されます。</li>
          <li>「課題・目標」ページから宿題を登録すると、日々のノルマが自動で計算されます。</li>
          <li>
            「家族・権限」ページの子供一覧から、読みやすさに合わせて「ふりがなON/OFF」を切り替えられます（下記参照）。
          </li>
        </ol>
      </section>

      <section className="border border-slate-200 rounded-lg bg-white p-5 space-y-4">
        <h2 className="font-semibold">お子さんの方</h2>
        <StepFlow
          steps={[
            { emoji: "🔑", label: "コードでログイン" },
            { emoji: "✅", label: "今日のぶんをチェック" },
            { emoji: "📅", label: "カレンダーで確認" },
          ]}
        />
        <ol className="list-decimal list-inside text-sm text-slate-700 space-y-2">
          <li>保護者からもらった6文字のログインコードで「コードでログイン」します。</li>
          <li>今日のノルマを確認して、終わったらチェックを入れて報告します。</li>
          <li>「課題・目標」ページのカレンダーで、これまでの進み具合を色で確認できます（下記参照）。</li>
          <li>一度ログインした端末では、次回から画面上部の切替メニューでかんたんに戻れます。</li>
        </ol>
      </section>

      <section className="border border-slate-200 rounded-lg bg-white p-5 space-y-4">
        <div>
          <h2 className="font-semibold">進捗カレンダーの見方</h2>
          <p className="text-sm text-slate-600 mt-1">
            「課題・目標」ページの課題一覧の上に、月ごとのカレンダーが表示されます。マスの色で毎日の進み具合が一目でわかります。日付をタップすると、その日にやった課題の詳細が下に開きます。
          </p>
        </div>
        <div className="border border-slate-200 rounded-lg bg-slate-50 p-4">
          <div className="grid grid-cols-7 gap-1.5 max-w-[220px]">
            {["日", "月", "火", "水", "木", "金", "土"].map((label) => (
              <div key={label} className="text-[10px] text-slate-500 text-center font-semibold">
                {label}
              </div>
            ))}
            {[
              "onTrack",
              "onTrack",
              "slightlyBehind",
              "onTrack",
              "quiteBehind",
              "pause",
              "onTrack",
            ].map((status, i) => (
              <div
                key={i}
                className={`aspect-square rounded border-2 text-[11px] flex items-center justify-center ${CALENDAR_STATUS_STYLE[status as keyof typeof CALENDAR_STATUS_STYLE]}`}
              >
                {i + 1}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-3 mt-3 border-t border-slate-200">
            {CALENDAR_LEGEND_STATUSES.map((status) => (
              <span key={status} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span
                  className={`inline-block w-3 h-3 rounded border ${CALENDAR_STATUS_STYLE[status]}`}
                />
                {CALENDAR_STATUS_LABEL[status]}
              </span>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-500">
          「だいぶ遅れています」は3日連続で未達成になったときに表示されます。
        </p>
      </section>

      <section className="border border-slate-200 rounded-lg bg-white p-5 space-y-4">
        <div>
          <h2 className="font-semibold">ふりがな表示（お子さん向け）</h2>
          <p className="text-sm text-slate-600 mt-1">
            まだ漢字に慣れていないお子さんでも読みやすいように、画面の漢字にふりがなを付けられます。「家族・権限」ページで保護者が子供ごとにON/OFFを切り替えます。
          </p>
        </div>
        <div className="border border-slate-200 rounded-lg bg-slate-50 p-4 flex items-center gap-6 flex-wrap">
          <div className="text-center">
            <p className="text-[10px] text-slate-500 mb-1">OFFのとき</p>
            <p className="text-lg font-medium">今日の課題</p>
          </div>
          <span className="text-slate-300">→</span>
          <div className="text-center">
            <p className="text-[10px] text-slate-500 mb-1">ONのとき</p>
            <p className="text-lg font-medium leading-loose">
              <ruby>
                今日<rt className="text-[0.55em] text-slate-500">きょう</rt>
              </ruby>
              の
              <ruby>
                課題<rt className="text-[0.55em] text-slate-500">かだい</rt>
              </ruby>
            </p>
          </div>
        </div>
      </section>

      <section className="border border-slate-200 rounded-lg bg-white p-5 space-y-3">
        <h2 className="font-semibold">よくある質問</h2>
        <div className="text-sm text-slate-700 space-y-3">
          <div>
            <p className="font-medium">パスワードを忘れた</p>
            <p className="text-slate-500">
              保護者ログイン画面の「パスワードをお忘れですか？」からリセットメールを送れます。ログイン画面のパスワード欄にある「表示」ボタンで、入力内容を確認しながら入力することもできます。
            </p>
          </div>
          <div>
            <p className="font-medium">同じ端末を子供2人以上で使いたい</p>
            <p className="text-slate-500">
              一度コードでログインすると、画面上部の「他のアカウントに切替」からログアウトなしで切り替えられます。
            </p>
          </div>
          <div>
            <p className="font-medium">ログインコードをコピーして送りたい</p>
            <p className="text-slate-500">
              「家族・権限」ページの「コードを表示」を押すと、コードの横に「コピー」ボタンが出るので、そのままメッセージアプリなどに貼り付けられます。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
