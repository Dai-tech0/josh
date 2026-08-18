"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";

type Tab = "adminLogin" | "adminSignup" | "code";

export default function AuthGate() {
  const [tab, setTab] = useState<Tab>("adminLogin");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">YATTANEにログイン</h1>
        <p className="text-sm text-slate-500 mt-1">
          保護者の方はメールアドレスでログイン・登録してください。子供・共有者の方は、保護者から発行されたログインコードでログインしてください。
        </p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        <TabButton active={tab === "adminLogin"} onClick={() => setTab("adminLogin")}>
          保護者ログイン
        </TabButton>
        <TabButton active={tab === "adminSignup"} onClick={() => setTab("adminSignup")}>
          保護者 新規登録
        </TabButton>
        <TabButton active={tab === "code"} onClick={() => setTab("code")}>
          コードでログイン
        </TabButton>
      </div>

      {tab === "adminLogin" && <AdminLoginForm />}
      {tab === "adminSignup" && <AdminSignupForm onDone={() => setTab("adminLogin")} />}
      {tab === "code" && <CodeLoginForm />}
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

function AdminLoginForm() {
  const { loginAdmin, authError } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">パスワード</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="bg-indigo-600 text-white text-sm px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
      >
        {submitting ? "ログイン中..." : "ログイン"}
      </button>
    </form>
  );
}

function AdminSignupForm({ onDone }: { onDone: () => void }) {
  const { signUpAdmin, authError } = useStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signUpAdmin(email, password, name);
      onDone();
    } catch {
      // authError はストア側で設定される
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
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
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">メールアドレス</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          パスワード（6文字以上）
        </label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="bg-indigo-600 text-white text-sm px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
      >
        {submitting ? "登録中..." : "新規登録する"}
      </button>
    </form>
  );
}

function CodeLoginForm() {
  const { loginWithCode, authError } = useStore();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await loginWithCode(code.trim());
    } catch {
      // authError はストア側で設定される
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
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
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm tracking-widest uppercase"
        />
        <p className="text-xs text-slate-400 mt-1">保護者から教えてもらった6桁のコードを入力してください。</p>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="bg-indigo-600 text-white text-sm px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
      >
        {submitting ? "ログイン中..." : "ログイン"}
      </button>
    </form>
  );
}
