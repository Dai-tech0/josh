"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { FamilyDefaults, TaskPriority, TaskType, TaskUnit } from "@/lib/types";
import { addDays, todayISO } from "@/lib/date";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// 科目プリセット: 選ぶと単位・課題タイプが自動で決まる（自由入力のみ手動指定）
const SUBJECT_PRESETS: Record<string, { unit: TaskUnit; type: TaskType; amountLabel: string } | null> = {
  国語ドリル: { unit: "ページ", type: "amount", amountLabel: "ページ数" },
  算数ドリル: { unit: "ページ", type: "amount", amountLabel: "ページ数" },
  理科ドリル: { unit: "ページ", type: "amount", amountLabel: "ページ数" },
  読書: { unit: "冊", type: "count", amountLabel: "冊数" },
  自由入力: null,
};
const SUBJECTS = Object.keys(SUBJECT_PRESETS);

interface Entry {
  key: string;
  subject: string;
  customName: string;
  customUnit: string;
  customType: TaskType;
  totalAmount: number;
  priority: TaskPriority;
  startDate: string;
  endDate: string;
  weeklyDays: number[];
}

function makeEntry(defaults?: FamilyDefaults): Entry {
  return {
    key: crypto.randomUUID(),
    subject: "国語ドリル",
    customName: "",
    customUnit: "",
    customType: "amount",
    totalAmount: 10,
    priority: defaults?.priority ?? "mid",
    startDate: defaults?.startDate ?? todayISO(),
    endDate: defaults?.endDate ?? addDays(todayISO(), 13),
    weeklyDays: defaults?.pauseRule.weeklyDays ?? [],
  };
}

export default function BatchTaskForm({
  childId,
  defaults,
  onDone,
}: {
  childId: string;
  defaults?: FamilyDefaults;
  onDone: () => void;
}) {
  const { addTask } = useStore();
  const [entries, setEntries] = useState<Entry[]>([makeEntry(defaults)]);
  const [error, setError] = useState<string | null>(null);

  function updateEntry(key: string, patch: Partial<Entry>) {
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, ...patch } : e)));
  }

  function toggleWeekday(key: string, d: number) {
    setEntries((prev) =>
      prev.map((e) =>
        e.key === key
          ? {
              ...e,
              weeklyDays: e.weeklyDays.includes(d)
                ? e.weeklyDays.filter((x) => x !== d)
                : [...e.weeklyDays, d],
            }
          : e
      )
    );
  }

  function addEntry() {
    setEntries((prev) => [...prev, makeEntry(defaults)]);
  }

  function removeEntry(key: string) {
    setEntries((prev) => (prev.length > 1 ? prev.filter((e) => e.key !== key) : prev));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    for (const entry of entries) {
      const preset = SUBJECT_PRESETS[entry.subject];
      const name = preset ? entry.subject : entry.customName.trim();
      if (!name) return setError("「自由入力」の課題名を入力してください。");
      if (entry.totalAmount <= 0) return setError(`「${name}」の総量は1以上にしてください。`);
      if (entry.startDate > entry.endDate) {
        return setError(`「${name}」の開始日は終了日より前にしてください。`);
      }
    }

    for (const entry of entries) {
      const preset = SUBJECT_PRESETS[entry.subject];
      addTask({
        childId,
        name: preset ? entry.subject : entry.customName.trim(),
        totalAmount: entry.totalAmount,
        unit: preset ? preset.unit : entry.customUnit.trim() || "個",
        type: preset ? preset.type : entry.customType,
        priority: entry.priority,
        startDate: entry.startDate,
        endDate: entry.endDate,
        pauseRule: { weeklyDays: entry.weeklyDays, customRanges: [] },
      });
    }
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      {entries.map((entry, idx) => {
        const preset = SUBJECT_PRESETS[entry.subject];
        return (
          <div key={entry.key} className="border border-slate-200 rounded-lg p-4 space-y-3 relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">宿題{idx + 1}</span>
              {entries.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEntry(entry.key)}
                  className="text-xs text-red-500 hover:underline"
                >
                  この宿題を削除
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">科目</label>
                <select
                  value={entry.subject}
                  onChange={(e) => updateEntry(entry.key, { subject: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">優先順位</label>
                <select
                  value={entry.priority}
                  onChange={(e) =>
                    updateEntry(entry.key, { priority: e.target.value as TaskPriority })
                  }
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white"
                >
                  <option value="high">高</option>
                  <option value="mid">中</option>
                  <option value="low">低</option>
                </select>
              </div>
            </div>

            {!preset && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">課題名</label>
                  <input
                    value={entry.customName}
                    onChange={(e) => updateEntry(entry.key, { customName: e.target.value })}
                    placeholder="例: 縄跳び"
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    単位（その他）
                  </label>
                  <input
                    value={entry.customUnit}
                    onChange={(e) => updateEntry(entry.key, { customUnit: e.target.value })}
                    placeholder="例: 回、枚、分"
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  {preset ? preset.amountLabel : "総量"}
                </label>
                <input
                  type="number"
                  min={1}
                  value={entry.totalAmount}
                  onChange={(e) =>
                    updateEntry(entry.key, { totalAmount: Number(e.target.value) })
                  }
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </div>
              {!preset && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    課題タイプ
                  </label>
                  <select
                    value={entry.customType}
                    onChange={(e) =>
                      updateEntry(entry.key, { customType: e.target.value as TaskType })
                    }
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white"
                  >
                    <option value="amount">総量型（日割り）</option>
                    <option value="count">個数型（週割り）</option>
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">開始日</label>
                <input
                  type="date"
                  value={entry.startDate}
                  onChange={(e) => updateEntry(entry.key, { startDate: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">終了日</label>
                <input
                  type="date"
                  value={entry.endDate}
                  onChange={(e) => updateEntry(entry.key, { endDate: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">
                休止日（毎週）
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {WEEKDAYS.map((label, dIdx) => (
                  <button
                    type="button"
                    key={dIdx}
                    onClick={() => toggleWeekday(entry.key, dIdx)}
                    className={`w-8 h-8 rounded-full text-xs border transition ${
                      entry.weeklyDays.includes(dIdx)
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-slate-600 border-slate-300 hover:border-indigo-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={addEntry}
        className="w-full border border-dashed border-slate-300 rounded-lg py-2 text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600"
      >
        ＋ 宿題をもう1つ追加
      </button>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          className="bg-indigo-600 text-white text-sm px-4 py-2 rounded hover:bg-indigo-700"
        >
          宿題を追加（{entries.length}件）
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-sm px-4 py-2 rounded text-slate-500 hover:bg-slate-100"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
