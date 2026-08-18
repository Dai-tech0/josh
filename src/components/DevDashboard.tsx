"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useStore } from "@/lib/store";

interface MemberInfo {
  id: string;
  name: string;
  role: "owner" | "viewer";
  loginCode: string;
}

interface FamilyStat {
  familyId: string;
  adminName: string;
  adminEmail: string | null;
  createdAt: string;
  members: MemberInfo[];
}

export default function DevDashboard() {
  const [stats, setStats] = useState<FamilyStat[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Firestore（外部ストア）への一括問い合わせを開始するための初期状態リセット
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const familiesSnap = await getDocs(collection(db, "families"));
        const results: FamilyStat[] = await Promise.all(
          familiesSnap.docs.map(async (familyDoc) => {
            const membersSnap = await getDocs(
              collection(db, "families", familyDoc.id, "members")
            );
            const members: MemberInfo[] = membersSnap.docs.map((m) => {
              const d = m.data();
              return {
                id: m.id,
                name: (d.name as string) ?? "",
                role: d.role as "owner" | "viewer",
                loginCode: (d.loginCode as string) ?? "",
              };
            });
            const data = familyDoc.data();
            return {
              familyId: familyDoc.id,
              adminName: (data.adminName as string) ?? "(名称未設定)",
              adminEmail: (data.adminEmail as string) ?? null,
              createdAt: (data.createdAt as string) ?? "",
              members,
            };
          })
        );
        if (!cancelled) {
          results.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
          setStats(results);
        }
      } catch {
        if (!cancelled) setError("データの取得に失敗しました。");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalFamilies = stats?.length ?? 0;
  const totalChildren =
    stats?.reduce((sum, s) => sum + s.members.filter((m) => m.role === "owner").length, 0) ?? 0;
  const totalSharers =
    stats?.reduce((sum, s) => sum + s.members.filter((m) => m.role === "viewer").length, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">開発者ダッシュボード</h1>
        <p className="text-sm text-slate-500 mt-1">
          登録されている全家族の状況を確認できます（閲覧専用）。
        </p>
      </div>

      {loading && <p className="text-sm text-slate-400">読み込み中...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {stats && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="登録家族数" value={`${totalFamilies}`} />
            <Stat label="子供アカウント合計" value={`${totalChildren}`} />
            <Stat label="共有者合計" value={`${totalSharers}`} />
          </div>

          {stats.length === 0 ? (
            <p className="text-sm text-slate-400">まだ登録がありません。</p>
          ) : (
            <ul className="space-y-3">
              {stats.map((s) => (
                <FamilyRow key={s.familyId} stat={s} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function FamilyRow({ stat }: { stat: FamilyStat }) {
  const { resetPassword } = useStore();
  const [open, setOpen] = useState(false);
  const [resetStatus, setResetStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleReset() {
    if (!stat.adminEmail) return;
    setResetStatus("sending");
    try {
      await resetPassword(stat.adminEmail);
      setResetStatus("sent");
    } catch {
      setResetStatus("error");
    }
  }

  const children = stat.members.filter((m) => m.role === "owner");
  const sharers = stat.members.filter((m) => m.role === "viewer");

  return (
    <li className="border border-slate-200 rounded-lg bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <button
            onClick={() => setOpen((o) => !o)}
            className="font-medium hover:text-indigo-600"
          >
            {stat.adminName} {open ? "▲" : "▼"}
          </button>
          <p className="text-xs text-slate-400">
            {stat.adminEmail ?? "(メール未記録)"} ／ 登録日:{" "}
            {stat.createdAt ? stat.createdAt.slice(0, 10) : "-"} ／ 子供{children.length}人・
            共有者{sharers.length}人
          </p>
        </div>
        {stat.adminEmail && (
          <div className="text-right shrink-0">
            <button
              onClick={handleReset}
              disabled={resetStatus === "sending"}
              className="text-xs text-indigo-600 hover:underline disabled:opacity-50"
            >
              {resetStatus === "sending" ? "送信中..." : "パスワード再設定メールを送る"}
            </button>
            {resetStatus === "sent" && (
              <p className="text-xs text-emerald-600 mt-0.5">送信しました</p>
            )}
            {resetStatus === "error" && <p className="text-xs text-red-600 mt-0.5">送信失敗</p>}
          </div>
        )}
      </div>

      {open && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
          {stat.members.length === 0 && (
            <p className="text-xs text-slate-400">メンバーはまだいません。</p>
          )}
          {stat.members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between text-sm bg-slate-50 rounded px-3 py-1.5"
            >
              <span>
                {m.name}
                <span className="text-xs text-slate-400 ml-2">
                  {m.role === "owner" ? "子供" : "共有者"}
                </span>
              </span>
              <span className="font-mono text-xs tracking-widest bg-white border border-slate-200 px-2 py-0.5 rounded">
                {m.loginCode}
              </span>
            </div>
          ))}
        </div>
      )}
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-indigo-300 bg-indigo-50 rounded-lg p-3 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold text-indigo-700">{value}</p>
    </div>
  );
}
