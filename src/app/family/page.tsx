"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { AdminUser, ChildUser } from "@/lib/types";
import { newCustomRange, summarizeChildProgress } from "@/lib/allocation";
import { formatDateJP, todayISO } from "@/lib/date";
import StampBadge from "@/components/StampBadge";

/** 新規作成直後にログインコードを目立たせて表示するバナー */
function NewLoginCodeBanner({
  name,
  code,
  onDismiss,
}: {
  name: string;
  code: string;
  onDismiss: () => void;
}) {
  return (
    <div className="border-2 border-indigo-300 bg-indigo-50 rounded-lg p-4 flex items-center justify-between gap-3">
      <p className="text-sm text-indigo-900">
        <strong>{name}</strong>さんのログインコード:{" "}
        <span className="font-mono text-lg tracking-widest font-bold">{code}</span>
        <br />
        <span className="text-xs text-indigo-700">
          このコードは今しか表示されません。控えて本人に伝えてください（あとから「コードを表示」でも確認できます）。
        </span>
      </p>
      <button
        onClick={onDismiss}
        className="text-xs text-indigo-500 hover:underline shrink-0"
      >
        閉じる
      </button>
    </div>
  );
}

/** 既存メンバーのログインコードを必要なときだけ表示する */
function LoginCodeReveal({ code }: { code: string }) {
  const [shown, setShown] = useState(false);
  return shown ? (
    <span className="text-xs font-mono tracking-widest bg-slate-100 px-2 py-0.5 rounded">
      {code}
      <button
        onClick={() => setShown(false)}
        className="ml-2 text-slate-400 hover:underline font-sans"
      >
        隠す
      </button>
    </span>
  ) : (
    <button onClick={() => setShown(true)} className="text-xs text-indigo-600 hover:underline">
      コードを表示
    </button>
  );
}

export default function FamilyPage() {
  const { hydrated, currentUser } = useStore();

  if (!hydrated) return <p className="text-slate-400 text-sm">読み込み中...</p>;

  if (!currentUser) {
    return <NeedLogin />;
  }

  if (currentUser.role === "admin") return <AdminFamilyView adminId={currentUser.id} />;
  if (currentUser.role === "owner") return <OwnerFamilyView child={currentUser} />;
  return <ViewerFamilyView childId={currentUser.childId} />;
}

function NeedLogin() {
  return (
    <div className="border border-slate-200 rounded-lg p-6 bg-white text-sm text-slate-600">
      ログインが必要です。トップページからアカウントを選んでください。
    </div>
  );
}

function SectionHeading({ title, desc }: { title: string; desc?: string }) {
  return (
    <div>
      <h1 className="text-xl font-bold">{title}</h1>
      {desc && <p className="text-sm text-slate-500 mt-1">{desc}</p>}
    </div>
  );
}

/* ---------------- 管理者（親）ビュー ---------------- */

function AdminFamilyView({ adminId }: { adminId: string }) {
  const { data, getChildrenOfAdmin, addChild, removeChild } = useStore();
  const admin = data.admins.find((a) => a.id === adminId);
  const children = getChildrenOfAdmin(adminId);
  const [newChildName, setNewChildName] = useState("");
  const [newlyCreated, setNewlyCreated] = useState<{ name: string; code: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRemoveChild(child: ChildUser) {
    if (
      !confirm(
        `「${child.name}」を削除しますか？この子供に紐づく課題・報告・共有者もすべて削除されます。`
      )
    )
      return;
    await removeChild(child.id);
  }

  async function handleAddChild(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const name = newChildName.trim();
    if (!name) return;
    try {
      const created = await addChild(name);
      setNewChildName("");
      setNewlyCreated({ name, code: created.loginCode });
    } catch {
      setError("子供アカウントの作成に失敗しました。もう一度お試しください。");
    }
  }

  return (
    <div className="space-y-8">
      <SectionHeading
        title="家族・権限管理"
        desc="子供アカウントの追加、各子供の共有者（応援してくれる人）を管理できます。編集権限は管理者（親）が持ちます。"
      />

      {admin && (
        <section className="border border-slate-200 rounded-lg bg-white p-5">
          <h2 className="font-semibold mb-2">管理者（親）アカウント</h2>
          <AdminNameEditor admin={admin} />
        </section>
      )}

      <FamilyDefaultsEditor adminId={adminId} />

      <section className="border border-slate-200 rounded-lg bg-white p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold">子供アカウント一覧</h2>
          <SharedCodeControl />
        </div>

        {newlyCreated && (
          <NewLoginCodeBanner
            name={newlyCreated.name}
            code={newlyCreated.code}
            onDismiss={() => setNewlyCreated(null)}
          />
        )}

        {children.length === 0 && (
          <p className="text-sm text-slate-400">まだ子供アカウントがありません。</p>
        )}
        <ul className="space-y-6">
          {children.map((c) => (
            <li key={c.id} className="border-t border-slate-100 pt-4 first:border-t-0 first:pt-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <ChildNameEditor child={c} />
                  <span className="text-xs text-slate-400">個別コード（個別に報告する場合）</span>
                  <LoginCodeReveal code={c.loginCode} />
                </div>
                <button
                  onClick={() => handleRemoveChild(c)}
                  className="text-xs text-red-500 hover:underline shrink-0"
                >
                  子供を削除
                </button>
              </div>
              <p className="text-xs text-slate-400 mb-2">オーナー（子供）</p>
              <ChildProgressCard childId={c.id} />
              <SharerManager childId={c.id} canEdit addedBy="admin" />
            </li>
          ))}
        </ul>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <form onSubmit={handleAddChild} className="flex gap-2 pt-2 border-t border-slate-100">
          <input
            value={newChildName}
            onChange={(e) => setNewChildName(e.target.value)}
            placeholder="子供の名前"
            className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white text-sm px-4 py-2 rounded hover:bg-indigo-700"
          >
            子供を追加
          </button>
        </form>
      </section>

      <RolePermissionTable />
    </div>
  );
}

/** 複数の子供が1台の端末で報告するための共通コード。家族に1つだけ発行できる */
function SharedCodeControl() {
  const { sharedDeviceCode, getOrCreateSharedCode } = useStore();
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleIssue() {
    setError(null);
    setIssuing(true);
    try {
      await getOrCreateSharedCode();
    } catch {
      setError("発行に失敗しました。もう一度お試しください。");
    } finally {
      setIssuing(false);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-slate-400">
        共通コード（複数で1台の端末で報告する場合）
      </span>
      {sharedDeviceCode ? (
        <LoginCodeReveal code={sharedDeviceCode} />
      ) : (
        <button
          onClick={handleIssue}
          disabled={issuing}
          className="text-xs text-indigo-600 hover:underline disabled:opacity-50"
        >
          {issuing ? "発行中..." : "発行する"}
        </button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

/** 子供ごとの進捗サマリー（今週の達成率・連続達成日数・直近のスタンプ） */
function ChildProgressCard({ childId }: { childId: string }) {
  const { getTasksOfChild, getLogsOfTask } = useStore();
  const tasks = getTasksOfChild(childId);
  const logs = tasks.flatMap((t) => getLogsOfTask(t.id));
  const summary = summarizeChildProgress(tasks, logs);

  if (summary.reportableThisWeek === 0 && summary.recentDays.length === 0) return null;

  return (
    <div className="border border-slate-100 bg-slate-50 rounded-lg p-3 mb-2 space-y-2">
      <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
        <span>
          今週の達成:{" "}
          <strong className="text-slate-800">
            {summary.achievedThisWeek}/{summary.reportableThisWeek}日
          </strong>
        </span>
        {summary.streak > 0 && (
          <span className="text-rose-600 font-medium">🔥{summary.streak}日連続達成中</span>
        )}
      </div>
      {summary.recentDays.length > 0 && (
        <div className="flex items-end gap-1.5">
          {summary.recentDays.map((d) => (
            <div key={d.date} className="flex flex-col items-center gap-0.5">
              <StampBadge tier={d.tier} size="sm" />
              <span className="text-[10px] text-slate-400">{formatDateJP(d.date)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChildNameEditor({ child }: { child: ChildUser }) {
  const { updateChild } = useStore();
  return (
    <InlineNameEditor initialName={child.name} onSave={(name) => updateChild(child.id, name)} />
  );
}

function AdminNameEditor({ admin }: { admin: AdminUser }) {
  const { updateAdmin } = useStore();
  return (
    <InlineNameEditor initialName={admin.name} onSave={(name) => updateAdmin(admin.id, name)} />
  );
}

function InlineNameEditor({
  initialName,
  onSave,
}: {
  initialName: string;
  onSave: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setEditing(false);
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          className="border border-slate-300 rounded px-2 py-1 text-sm"
        />
        <button type="submit" className="text-xs text-indigo-600 hover:underline">
          保存
        </button>
        <button
          type="button"
          onClick={() => {
            setName(initialName);
            setEditing(false);
          }}
          className="text-xs text-slate-400 hover:underline"
        >
          キャンセル
        </button>
      </form>
    );
  }

  return (
    <p className="font-medium">
      {initialName}
      <button
        onClick={() => setEditing(true)}
        className="ml-2 text-xs text-indigo-600 hover:underline"
      >
        名前を編集
      </button>
    </p>
  );
}

/* ---------------- 家族共通デフォルト設定（設定の継承） ---------------- */

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function FamilyDefaultsEditor({ adminId }: { adminId: string }) {
  const { getFamilyDefaults, updateFamilyDefaults } = useStore();
  const defaults = getFamilyDefaults(adminId);
  const [open, setOpen] = useState(false);
  const [rangeLabel, setRangeLabel] = useState("");
  const [rangeStart, setRangeStart] = useState(todayISO());
  const [rangeEnd, setRangeEnd] = useState(todayISO());
  const [rangeError, setRangeError] = useState<string | null>(null);

  function toggleWeekday(d: number) {
    const weeklyDays = defaults.pauseRule.weeklyDays.includes(d)
      ? defaults.pauseRule.weeklyDays.filter((x) => x !== d)
      : [...defaults.pauseRule.weeklyDays, d];
    updateFamilyDefaults(adminId, { pauseRule: { ...defaults.pauseRule, weeklyDays } });
  }

  function addRange() {
    setRangeError(null);
    if (!rangeLabel.trim()) {
      setRangeError("休止期間のラベルを入力してください。");
      return;
    }
    if (rangeStart > rangeEnd) {
      setRangeError("休止期間の開始日は終了日より前にしてください。");
      return;
    }
    updateFamilyDefaults(adminId, {
      pauseRule: {
        ...defaults.pauseRule,
        customRanges: [
          ...defaults.pauseRule.customRanges,
          newCustomRange(rangeLabel.trim(), rangeStart, rangeEnd),
        ],
      },
    });
    setRangeLabel("");
  }

  function removeRange(id: string) {
    updateFamilyDefaults(adminId, {
      pauseRule: {
        ...defaults.pauseRule,
        customRanges: defaults.pauseRule.customRanges.filter((r) => r.id !== id),
      },
    });
  }

  return (
    <section className="border border-slate-200 rounded-lg bg-white p-5 space-y-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left"
      >
        <div>
          <h2 className="font-semibold">
            {open ? "▼" : "▶"} 新しい課題の既定設定（設定の継承）
          </h2>
          {!open && (
            <p className="text-xs text-slate-500 mt-1">
              新しく課題を登録するときの初期値（期限・休止曜日・優先度）を設定します。
            </p>
          )}
        </div>
      </button>
      {open && (
        <>
      <p className="text-xs text-slate-500 -mt-2">
        ここで設定した期限・休止曜日・優先度は、新しく課題を登録するときの初期値になります。課題ごとに個別に上書きできます。
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">既定の開始日</label>
          <input
            type="date"
            value={defaults.startDate}
            onChange={(e) => updateFamilyDefaults(adminId, { startDate: e.target.value })}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">既定の終了日</label>
          <input
            type="date"
            value={defaults.endDate}
            onChange={(e) => updateFamilyDefaults(adminId, { endDate: e.target.value })}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">既定の優先度</label>
        <select
          value={defaults.priority}
          onChange={(e) =>
            updateFamilyDefaults(adminId, {
              priority: e.target.value as "high" | "mid" | "low",
            })
          }
          className="border border-slate-300 rounded px-3 py-2 text-sm bg-white"
        >
          <option value="high">高</option>
          <option value="mid">中</option>
          <option value="low">低</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-2">
          既定の休止日（毎週）
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {WEEKDAYS.map((label, idx) => (
            <button
              type="button"
              key={idx}
              onClick={() => toggleWeekday(idx)}
              className={`w-9 h-9 rounded-full text-sm border transition ${
                defaults.pauseRule.weeklyDays.includes(idx)
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-600 border-slate-300 hover:border-indigo-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-2">
          既定の休止日（個別期間指定。例: 旅行期間）
        </label>
        {defaults.pauseRule.customRanges.length > 0 && (
          <ul className="space-y-1 mb-2">
            {defaults.pauseRule.customRanges.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between text-sm bg-slate-50 rounded px-3 py-1.5"
              >
                <span>
                  {r.label}: {r.start} 〜 {r.end}
                </span>
                <button
                  type="button"
                  onClick={() => removeRange(r.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
        {rangeError && <p className="text-xs text-red-600 mb-2">{rangeError}</p>}
        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={rangeLabel}
            onChange={(e) => setRangeLabel(e.target.value)}
            placeholder="ラベル（例: 旅行）"
            className="border border-slate-300 rounded px-2 py-1.5 text-sm w-32"
          />
          <input
            type="date"
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm"
          />
          <span className="text-slate-400 text-sm">〜</span>
          <input
            type="date"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={addRange}
            className="bg-slate-700 text-white text-xs px-3 py-1.5 rounded hover:bg-slate-800"
          >
            期間を追加
          </button>
        </div>
      </div>
        </>
      )}
    </section>
  );
}

/* ---------------- オーナー（子供）ビュー ---------------- */

function OwnerFamilyView({ child }: { child: ChildUser }) {
  return (
    <div className="space-y-8">
      <SectionHeading
        title="家族・権限管理"
        desc="あなたを応援してくれる共有者を追加・削除できます。目標や課題の編集は管理者（親）が行います。"
      />
      <section className="border border-slate-200 rounded-lg bg-white p-5 space-y-4">
        <h2 className="font-semibold">{child.name}さんの共有者</h2>
        <SharerManager childId={child.id} canEdit addedBy="owner" />
      </section>
      <RolePermissionTable />
    </div>
  );
}

/* ---------------- 共有者（評価者）ビュー ---------------- */

function ViewerFamilyView({ childId }: { childId: string }) {
  const { data } = useStore();
  const child = data.children.find((c) => c.id === childId);

  return (
    <div className="space-y-8">
      <SectionHeading
        title="家族・権限管理"
        desc="共有者は閲覧のみ可能です。編集はできません。"
      />
      <section className="border border-slate-200 rounded-lg bg-white p-5 space-y-4">
        <h2 className="font-semibold">応援している子供</h2>
        <p className="text-sm">{child?.name ?? "（見つかりません）"}</p>
        {child && (
          <>
            <h3 className="text-sm font-medium text-slate-600 pt-2">他の共有者</h3>
            <SharerManager childId={child.id} canEdit={false} addedBy="admin" />
          </>
        )}
      </section>
      <RolePermissionTable />
    </div>
  );
}

/* ---------------- 共有者 追加・削除 共通コンポーネント ---------------- */

function SharerManager({
  childId,
  canEdit,
  addedBy,
}: {
  childId: string;
  canEdit: boolean;
  addedBy: "admin" | "owner";
}) {
  const { getSharersOfChild, addSharer, removeSharer } = useStore();
  const sharers = getSharersOfChild(childId);
  const [name, setName] = useState("");
  const [newlyCreated, setNewlyCreated] = useState<{ name: string; code: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const created = await addSharer(childId, trimmed, addedBy);
      setName("");
      setNewlyCreated({ name: trimmed, code: created.loginCode });
    } catch {
      setError("共有者の作成に失敗しました。もう一度お試しください。");
    }
  }

  return (
    <div className="space-y-2">
      {newlyCreated && (
        <NewLoginCodeBanner
          name={newlyCreated.name}
          code={newlyCreated.code}
          onDismiss={() => setNewlyCreated(null)}
        />
      )}
      {sharers.length === 0 ? (
        <p className="text-xs text-slate-400">共有者はまだいません。</p>
      ) : (
        <ul className="space-y-1">
          {sharers.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between text-sm bg-slate-50 rounded px-3 py-1.5"
            >
              <span className="flex items-center gap-2">
                {s.name}
                <span className="text-xs text-slate-400">共有者（閲覧・応援のみ）</span>
                <LoginCodeReveal code={s.loginCode} />
              </span>
              {canEdit && (
                <button
                  onClick={() => removeSharer(s.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  削除
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {canEdit && (
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="共有者の名前（例: おばあちゃん）"
            className="flex-1 border border-slate-300 rounded px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="bg-slate-700 text-white text-xs px-3 py-1.5 rounded hover:bg-slate-800"
          >
            追加
          </button>
        </form>
      )}
    </div>
  );
}

function RolePermissionTable() {
  return (
    <section className="border border-slate-200 rounded-lg bg-white p-5">
      <h2 className="font-semibold mb-3 text-sm">役割ごとにできること</h2>
      <table className="w-full text-xs text-left border-collapse">
        <thead>
          <tr className="text-slate-400 border-b border-slate-100">
            <th className="py-1.5 pr-2 font-medium">役割</th>
            <th className="py-1.5 font-medium">できること</th>
          </tr>
        </thead>
        <tbody className="align-top">
          <tr className="border-b border-slate-50">
            <td className="py-2 pr-2 whitespace-nowrap font-medium">オーナー（子供）</td>
            <td className="py-2 text-slate-600">
              目標設定・タスク調整（管理者がいる場合は管理者が行うことが多い）、日々の報告、共有者の追加・削除
            </td>
          </tr>
          <tr className="border-b border-slate-50">
            <td className="py-2 pr-2 whitespace-nowrap font-medium">管理者（親）</td>
            <td className="py-2 text-slate-600">
              オーナーに代わって目標設定・タスク調整、共有者の追加・削除
            </td>
          </tr>
          <tr>
            <td className="py-2 pr-2 whitespace-nowrap font-medium">共有者（評価者）</td>
            <td className="py-2 text-slate-600">報告を見る、スタンプ・コメントで応援する（編集不可）</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
