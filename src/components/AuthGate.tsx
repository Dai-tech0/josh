"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";

type Tab = "adminLogin" | "adminSignup" | "emailLink" | "code";

const TAB_PARAM_MAP: Record<string, Tab> = {
  signup: "adminSignup",
  email: "emailLink",
  code: "code",
};

export default function AuthGate() {
  const [tab, setTab] = useState<Tab>("adminLogin");
  const searchParams = useSearchParams();

  const referredBy = searchParams.get("ref") ?? undefined;

  useEffect(() => {
    const requested = searchParams.get("tab");
    if (requested && TAB_PARAM_MAP[requested]) {
      // URL（外部からのリンク）で指定されたタブに合わせる
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab(TAB_PARAM_MAP[requested]);
    } else if (referredBy) {
      // 紹介リンク（?ref=）で来た場合は新規登録タブを直接開く
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab("adminSignup");
    }
  }, [searchParams, referredBy]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Yattaにログイン</h1>
        <p className="text-sm text-slate-500 mt-1">
          保護者の方はメールアドレスでログイン・登録してください。子供・共有者の方は、保護者から発行されたログインコードでログインしてください。
        </p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        <TabButton active={tab === "adminLogin"} onClick={() => setTab("adminLogin")}>
          保護者ログイン
        </TabButton>
        <TabButton active={tab === "emailLink"} onClick={() => setTab("emailLink")}>
          メールでログイン
        </TabButton>
        <TabButton active={tab === "code"} onClick={() => setTab("code")}>
          コードでログイン
        </TabButton>
      </div>

      {tab === "adminLogin" && <AdminLoginForm onSignup={() => setTab("adminSignup")} />}
      {tab === "adminSignup" && (
        <AdminSignupForm
          onDone={() => setTab("adminLogin")}
          onBack={() => setTab("adminLogin")}
          referredBy={referredBy}
        />
      )}
      {tab === "emailLink" && <EmailLinkForm />}
      {tab === "code" && <CodeLoginForm />}
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  required,
  minLength,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        required={required}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-400 rounded px-3 py-2 pr-14 text-sm"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-indigo-600"
      >
        {visible ? "隠す" : "表示"}
      </button>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-sm border-b-2 -mb-px transition ${
        active
          ? "border-indigo-600 text-indigo-600 font-medium"
          : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function AdminLoginForm({ onSignup }: { onSignup: () => void }) {
  const { loginAdmin, authError } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showReset, setShowReset] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await loginAdmin(email, password);
    } catch {
      // authError はストア側で設定される
    } finally {
      setSubmitting(false);
    }
  }

  if (showReset) {
    return <PasswordResetForm initialEmail={email} onBack={() => setShowReset(false)} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
      {authError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {authError}
        </p>
      )}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">メールアドレス</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-slate-400 rounded px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">パスワード</label>
        <PasswordInput value={password} onChange={setPassword} required />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="bg-indigo-600 text-white text-sm px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? "ログイン中..." : "ログイン"}
        </button>
        <button
          type="button"
          onClick={() => setShowReset(true)}
          className="text-xs text-slate-500 hover:text-indigo-600 hover:underline"
        >
          パスワードをお忘れですか？
        </button>
      </div>
      <p className="text-xs text-slate-500">
        保護者の方ではじめてのご利用ですか？{" "}
        <button
          type="button"
          onClick={onSignup}
          className="text-indigo-600 hover:underline font-medium"
        >
          新規登録はコチラ
        </button>
      </p>
    </form>
  );
}

function PasswordResetForm({ initialEmail, onBack }: { initialEmail: string; onBack: () => void }) {
  const { resetPassword, authError } = useStore();
  const [email, setEmail] = useState(initialEmail);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch {
      // authError はストア側で設定される
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-3 max-w-sm">
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
          パスワード再設定用のメールを送信しました。メール内のリンクから新しいパスワードを設定してください。
        </p>
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-indigo-600 hover:underline"
        >
          ← ログイン画面に戻る
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
      <p className="text-sm text-slate-500">
        登録したメールアドレスを入力してください。パスワード再設定用のリンクをお送りします。
      </p>
      {authError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {authError}
        </p>
      )}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">メールアドレス</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-slate-400 rounded px-3 py-2 text-sm"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="bg-indigo-600 text-white text-sm px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? "送信中..." : "再設定メールを送る"}
        </button>
        <button type="button" onClick={onBack} className="text-xs text-slate-500 hover:underline">
          キャンセル
        </button>
      </div>
    </form>
  );
}

function AdminSignupForm({
  onDone,
  onBack,
  referredBy,
}: {
  onDone: () => void;
  onBack: () => void;
  referredBy?: string;
}) {
  const { signUpAdmin, authError } = useStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signUpAdmin(email, password, name, referredBy);
      onDone();
    } catch {
      // authError はストア側で設定される
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
      {referredBy && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
          お友達の紹介からのご登録ですね！
        </p>
      )}
      {authError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {authError}
        </p>
      )}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">お名前</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 山田 花子"
          className="w-full border border-slate-400 rounded px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">メールアドレス</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-slate-400 rounded px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          パスワード（6文字以上）
        </label>
        <PasswordInput value={password} onChange={setPassword} required minLength={6} />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="bg-indigo-600 text-white text-sm px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? "登録中..." : "新規登録する"}
        </button>
        <button type="button" onClick={onBack} className="text-xs text-slate-500 hover:underline">
          ← ログインに戻る
        </button>
      </div>
    </form>
  );
}

function EmailLinkForm() {
  const { sendLoginLink, authError } = useStore();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await sendLoginLink(email);
      setSent(true);
    } catch {
      // authError はストア側で設定される
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-3 max-w-sm">
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
          ログイン用リンクをメールで送信しました。届いたメールのリンクをこの端末で開くとログインできます。
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="text-xs text-indigo-600 hover:underline"
        >
          ← 戻る
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
      <p className="text-sm text-slate-500">
        パスワードの代わりに、メールで届くリンクからログインできます（保護者ですでに登録済みの方向け。未登録のメールアドレスの場合は新しいアカウントとして案内されます）。
      </p>
      {authError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {authError}
        </p>
      )}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">メールアドレス</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-slate-400 rounded px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="bg-indigo-600 text-white text-sm px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
      >
        {submitting ? "送信中..." : "ログインリンクを送る"}
      </button>
    </form>
  );
}

function CodeLoginForm() {
  const { loginWithCode, authError, knownCodeAccounts, forgetCodeAccount } = useStore();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitCode(rawCode: string) {
    setSubmitting(true);
    try {
      await loginWithCode(rawCode.trim());
    } catch {
      // authError はストア側で設定される
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitCode(code);
  }

  return (
    <div className="space-y-4 max-w-sm">
      {knownCodeAccounts.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">この端末で使ったことがあるアカウント</p>
          <ul className="space-y-1">
            {knownCodeAccounts.map((a) => (
              <li
                key={a.code}
                className="flex items-center justify-between text-sm border border-slate-200 rounded px-3 py-2"
              >
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => submitCode(a.code)}
                  className="text-left flex-1 hover:text-indigo-600 disabled:opacity-50"
                >
                  {a.name}
                  <span className="text-xs text-slate-500 ml-2">
                    {a.role === "owner" ? "子供" : "共有者"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => forgetCodeAccount(a.code)}
                  className="text-xs text-slate-500 hover:text-red-500 hover:underline ml-2"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 mt-2">または、コードを直接入力してログイン</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
      {authError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {authError}
        </p>
      )}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">ログインコード</label>
        <input
          required
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="例: K3F9QZ"
          className="w-full border border-slate-400 rounded px-3 py-2 text-sm tracking-widest uppercase"
        />
        <p className="text-xs text-slate-500 mt-1">保護者から教えてもらった6桁のコードを入力してください。</p>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="bg-indigo-600 text-white text-sm px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
      >
        {submitting ? "ログイン中..." : "ログイン"}
      </button>
      </form>
    </div>
  );
}
