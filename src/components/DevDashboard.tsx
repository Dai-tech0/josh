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
          登録されている全家族の状況を確認できます。名前の編集・削除もここから行えます。
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
                <FamilyRow
                  key={s.familyId}
                  stat={s}
                  onDeleted={() =>
                    setStats((prev) => prev?.filter((x) => x.familyId !== s.familyId) ?? null)
                  }
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function FamilyRow({ stat, onDeleted }: { stat: FamilyStat; onDeleted: () => void }) {
  const { resetPassword, updateAdmin, developerDeleteFamily } = useStore();
  const [open, setOpen] = useState(false);
  const [resetStatus, setResetStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(stat.adminName);
  const [adminName, setAdminName] = useState(stat.adminName);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    await updateAdmin(stat.familyId, trimmed);
    setAdminName(trimmed);
    setEditingName(false);
  }

  async function handleDelete() {
    if (
      !confirm(
        `「${adminName}」(${stat.adminEmail ?? "メール未記録"})の家族データをすべて削除しますか？子供・共有者・課題・報告もすべて削除され、元に戻せません。`
      )
    )
      return;
    setDeleteError(null);
    setDeleting(true);
    try {
      await developerDeleteFamily(stat.familyId);
      onDeleted();
    } catch {
      setDeleteError("削除に失敗しました。もう一度お試しください。");
      setDeleting(false);
    }
  }

  const children = stat.members.filter((m) => m.role === "owner");
  const sharers = stat.members.filter((m) => m.role === "viewer");

  return (
    <li className="border border-slate-200 rounded-lg bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          {editingName ? (
            <form onSubmit={handleSaveName} className="flex items-center gap-2">
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                autoFocus
                className="border border-slate-300 rounded px-2 py-1 text-sm"
              />
              <button type="submit" className="text-xs text-indigo-600 hover:underline">
                保存
              </button>
              <button
                type="button"
                onClick={() => {
                  setNameInput(adminName);
                  setEditingName(false);
                }}
                className="text-xs text-slate-400 hover:underline"
              >
                キャンセル
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOpen((o) => !o)}
                className="font-medium hover:text-indigo-600"
              >
                {adminName} {open ? "▲" : "▼"}
              </button>
              <button
                onClick={() => {
                  setNameInput(adminName);
                  setEditingName(true);
                }}
                className="text-xs text-indigo-600 hover:underline"
              >
                名前を編集
              </button>
            </div>
          )}
          <p className="text-xs text-slate-400">
            {stat.adminEmail ?? "(メール未記録)"} ／ 登録日:{" "}
            {stat.createdAt ? stat.createdAt.slice(0, 10) : "-"} ／ 子供{children.length}人・
            共有者{sharers.length}人
          </p>
        </div>
        <div className="text-right shrink-0 space-y-1">
          {stat.adminEmail && (
            <div>
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
          <div>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs text-red-500 hover:underline disabled:opacity-50"
            >
              {deleting ? "削除中..." : "家族を削除"}
            </button>
            {deleteError && <p className="text-xs text-red-600 mt-0.5">{deleteError}</p>}
          </div>
        </div>
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
