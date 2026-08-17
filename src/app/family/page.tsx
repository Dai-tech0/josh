"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { AdminUser, ChildUser } from "@/lib/types";
import { newCustomRange } from "@/lib/allocation";
import { todayISO } from "@/lib/date";

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

  function handleRemoveChild(child: ChildUser) {
    if (
      !confirm(
        `「${child.name}」を削除しますか？この子供に紐づく課題・報告・共有者もすべて削除されます。`
      )
    )
      return;
    removeChild(child.id);
  }

  function handleAddChild(e: React.FormEvent) {
    e.preventDefault();
    const name = newChildName.trim();
    if (!name) return;
    addChild(name);
    setNewChildName("");
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
        <h2 className="font-semibold">子供アカウント一覧</h2>
        {children.length === 0 && (
          <p className="text-sm text-slate-400">まだ子供アカウントがありません。</p>
        )}
        <ul className="space-y-6">
          {children.map((c) => (
            <li key={c.id} className="border-t border-slate-100 pt-4 first:border-t-0 first:pt-0">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <ChildNameEditor child={c} />
                  <p className="text-xs text-slate-400">オーナー（子供）</p>
                </div>
                <button
                  onClick={() => handleRemoveChild(c)}
                  className="text-xs text-red-500 hover:underline shrink-0"
                >
                  子供を削除
                </button>
              </div>
              <SharerManager childId={c.id} canEdit addedBy="admin" />
            </li>
          ))}
        </ul>

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
      <div>
        <h2 className="font-semibold">新しい課題の既定設定（設定の継承）</h2>
        <p className="text-xs text-slate-500 mt-1">
          ここで設定した期限・休止曜日・優先度は、新しく課題を登録するときの初期値になります。課題ごとに個別に上書きできます。
        </p>
      </div>
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

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    addSharer(childId, trimmed, addedBy);
    setName("");
  }

  return (
    <div className="space-y-2">
      {sharers.length === 0 ? (
        <p className="text-xs text-slate-400">共有者はまだいません。</p>
      ) : (
        <ul className="space-y-1">
          {sharers.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between text-sm bg-slate-50 rounded px-3 py-1.5"
            >
              <span>
                {s.name}
                <span className="text-xs text-slate-400 ml-2">共有者（閲覧・応援のみ）</span>
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
