export const metadata = {
  title: "使い方ガイド - YATTANE",
};

export default function GuidePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">使い方ガイド</h1>
        <p className="text-sm text-slate-500 mt-1">かんたん3ステップで始められます。</p>
      </div>

      <section className="border border-slate-200 rounded-lg bg-white p-5 space-y-3">
        <h2 className="font-semibold">保護者の方</h2>
        <ol className="list-decimal list-inside text-sm text-slate-700 space-y-2">
          <li>トップページの「保護者 新規登録」からメールアドレスで登録します。</li>
          <li>「家族・権限」ページから子供を追加すると、ログインコード(6文字)が発行されます。</li>
          <li>「課題・目標」ページから宿題を登録すると、日々のノルマが自動で計算されます。</li>
        </ol>
      </section>

      <section className="border border-slate-200 rounded-lg bg-white p-5 space-y-3">
        <h2 className="font-semibold">お子さんの方</h2>
        <ol className="list-decimal list-inside text-sm text-slate-700 space-y-2">
          <li>保護者からもらった6文字のログインコードで「コードでログイン」します。</li>
          <li>今日のノルマを確認して、終わったらチェックを入れて報告します。</li>
          <li>一度ログインした端末では、次回から画面上部の切替メニューでかんたんに戻れます。</li>
        </ol>
      </section>

      <section className="border border-slate-200 rounded-lg bg-white p-5 space-y-3">
        <h2 className="font-semibold">よくある質問</h2>
        <div className="text-sm text-slate-700 space-y-3">
          <div>
            <p className="font-medium">パスワードを忘れた</p>
            <p className="text-slate-500">
              保護者ログイン画面の「パスワードをお忘れですか？」からリセットメールを送れます。
            </p>
          </div>
          <div>
            <p className="font-medium">同じ端末を子供2人以上で使いたい</p>
            <p className="text-slate-500">
              一度コードでログインすると、画面上部の「他のアカウントに切替」からログアウトなしで切り替えられます。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
