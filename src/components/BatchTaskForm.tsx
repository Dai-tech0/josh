"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { CustomPauseRange, FamilyDefaults, TaskPriority, TaskType } from "@/lib/types";
import { newCustomRange } from "@/lib/allocation";
import { addDays, todayISO } from "@/lib/date";
import {
  DRILL_CATEGORIES,
  DRILL_CATEGORY_LABEL,
  DRILL_PRESETS,
  defaultDrillCategoryForAge,
  type DrillCategory,
} from "@/lib/drillPresets";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const FREE_INPUT = "自由入力";

function subjectsOf(category: DrillCategory): string[] {
  return [...Object.keys(DRILL_PRESETS[category]), FREE_INPUT];
}

function presetOf(category: DrillCategory, subject: string) {
  return DRILL_PRESETS[category][subject] ?? null;
}

interface Entry {
  key: string;
  category: DrillCategory;
  subject: string;
  customName: string;
  customUnit: string;
  customType: TaskType;
  totalAmount: number;
  priority: TaskPriority;
  startDate: string;
  endDate: string;
  weeklyDays: number[];
  customRanges: CustomPauseRange[];
}

function makeEntry(defaults?: FamilyDefaults, childAge?: number): Entry {
  const category = defaultDrillCategoryForAge(childAge);
  return {
    key: crypto.randomUUID(),
    category,
    subject: subjectsOf(category)[0],
    customName: "",
    customUnit: "",
    customType: "amount",
    totalAmount: 10,
    priority: defaults?.priority ?? "mid",
    startDate: defaults?.startDate ?? todayISO(),
    endDate: defaults?.endDate ?? addDays(todayISO(), 13),
    weeklyDays: defaults?.pauseRule.weeklyDays ?? [],
    customRanges: defaults?.pauseRule.customRanges ?? [],
  };
}

export default function BatchTaskForm({
  childId,
  childAge,
  defaults,
  onDone,
}: {
  childId: string;
  childAge?: number;
  defaults?: FamilyDefaults;
  onDone: () => void;
}) {
  const { addTask } = useStore();
  const [entries, setEntries] = useState<Entry[]>([makeEntry(defaults, childAge)]);
  const [error, setError] = useState<string | null>(null);
  const [rangeInputs, setRangeInputs] = useState<
    Record<string, { label: string; start: string; end: string }>
  >({});
  const [advancedOpen, setAdvancedOpen] = useState<Record<string, boolean>>({});

  function rangeInputFor(key: string) {
    return rangeInputs[key] ?? { label: "", start: todayISO(), end: todayISO() };
  }

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
    setEntries((prev) => [...prev, makeEntry(defaults, childAge)]);
  }

  function removeEntry(key: string) {
    setEntries((prev) => (prev.length > 1 ? prev.filter((e) => e.key !== key) : prev));
  }

  function addRange(key: string) {
    const input = rangeInputFor(key);
    if (!input.label.trim()) return;
    if (input.start > input.end) {
      setError("休止期間の開始日は終了日より前にしてください。");
      return;
    }
    updateEntry(key, {
      customRanges: [
        ...(entries.find((e) => e.key === key)?.customRanges ?? []),
        newCustomRange(input.label.trim(), input.start, input.end),
      ],
    });
    setRangeInputs((prev) => ({ ...prev, [key]: { label: "", start: todayISO(), end: todayISO() } }));
  }

  function removeRange(key: string, rangeId: string) {
    const entry = entries.find((e) => e.key === key);
    if (!entry) return;
    updateEntry(key, { customRanges: entry.customRanges.filter((r) => r.id !== rangeId) });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    for (const entry of entries) {
      const preset = presetOf(entry.category, entry.subject);
      const name = preset ? entry.subject : entry.customName.trim();
      if (!name) return setError("「自由入力」の課題名を入力してください。");
      if (entry.totalAmount <= 0) return setError(`「${name}」の総量は1以上にしてください。`);
      if (entry.startDate > entry.endDate) {
        return setError(`「${name}」の開始日は終了日より前にしてください。`);
      }
    }

    await Promise.all(
      entries.map((entry) => {
        const preset = presetOf(entry.category, entry.subject);
        return addTask({
          childId,
          name: preset ? entry.subject : entry.customName.trim(),
          totalAmount: entry.totalAmount,
          unit: preset ? preset.unit : entry.customUnit.trim() || "個",
          type: preset ? preset.type : entry.customType,
          priority: entry.priority,
          startDate: entry.startDate,
          endDate: entry.endDate,
          pauseRule: { weeklyDays: entry.weeklyDays, customRanges: entry.customRanges },
        });
      })
    );
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
        const preset = presetOf(entry.category, entry.subject);
        return (
          <div key={entry.key} className="border border-slate-200 rounded-lg p-4 space-y-3 relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">宿題{idx + 1}</span>
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

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">学年区分</label>
              <div className="flex gap-1.5 flex-wrap">
                {DRILL_CATEGORIES.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() =>
                      updateEntry(entry.key, { category: c, subject: subjectsOf(c)[0] })
                    }
                    className={`px-3 py-1.5 rounded-full text-xs border transition ${
                      entry.category === c
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-slate-600 border-slate-400 hover:border-indigo-400"
                    }`}
                  >
                    {DRILL_CATEGORY_LABEL[c]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">科目</label>
                <select
                  value={entry.subject}
                  onChange={(e) => updateEntry(entry.key, { subject: e.target.value })}
                  className="w-full border border-slate-400 rounded px-3 py-2 text-sm bg-white"
                >
                  {subjectsOf(entry.category).map((s) => (
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
                  className="w-full border border-slate-400 rounded px-3 py-2 text-sm bg-white"
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
                    className="w-full border border-slate-400 rounded px-3 py-2 text-sm"
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
                    className="w-full border border-slate-400 rounded px-3 py-2 text-sm"
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
                  className="w-full border border-slate-400 rounded px-3 py-2 text-sm"
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
                    className="w-full border border-slate-400 rounded px-3 py-2 text-sm bg-white"
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
                  className="w-full border border-slate-400 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">終了日</label>
                <input
                  type="date"
                  value={entry.endDate}
                  onChange={(e) => updateEntry(entry.key, { endDate: e.target.value })}
                  className="w-full border border-slate-400 rounded px-3 py-2 text-sm"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setAdvancedOpen((prev) => ({ ...prev, [entry.key]: !prev[entry.key] }))
              }
              className="text-xs text-indigo-600 hover:underline"
            >
              {advancedOpen[entry.key] ? "▼" : "▶"} 詳細設定（休止日など）
              {(entry.weeklyDays.length > 0 || entry.customRanges.length > 0) &&
                !advancedOpen[entry.key] &&
                "・設定あり"}
            </button>

            {advancedOpen[entry.key] && (
              <>
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
                        : "bg-white text-slate-600 border-slate-400 hover:border-indigo-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">
                休止日（個別期間指定。例: 旅行期間）
              </label>
              {entry.customRanges.length > 0 && (
                <ul className="space-y-1 mb-2">
                  {entry.customRanges.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between text-sm bg-slate-50 rounded px-3 py-1.5"
                    >
                      <span>
                        {r.label}: {r.start} 〜 {r.end}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeRange(entry.key, r.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        削除
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  value={rangeInputFor(entry.key).label}
                  onChange={(e) =>
                    setRangeInputs((prev) => ({
                      ...prev,
                      [entry.key]: { ...rangeInputFor(entry.key), label: e.target.value },
                    }))
                  }
                  placeholder="ラベル（例: 旅行）"
                  className="border border-slate-400 rounded px-2 py-1.5 text-sm w-28"
                />
                <input
                  type="date"
                  value={rangeInputFor(entry.key).start}
                  onChange={(e) =>
                    setRangeInputs((prev) => ({
                      ...prev,
                      [entry.key]: { ...rangeInputFor(entry.key), start: e.target.value },
                    }))
                  }
                  className="border border-slate-400 rounded px-2 py-1.5 text-sm"
                />
                <span className="text-slate-500 text-sm">〜</span>
                <input
                  type="date"
                  value={rangeInputFor(entry.key).end}
                  onChange={(e) =>
                    setRangeInputs((prev) => ({
                      ...prev,
                      [entry.key]: { ...rangeInputFor(entry.key), end: e.target.value },
                    }))
                  }
                  className="border border-slate-400 rounded px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => addRange(entry.key)}
                  className="bg-slate-700 text-white text-xs px-3 py-1.5 rounded hover:bg-slate-800"
                >
                  期間を追加
                </button>
              </div>
            </div>
              </>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={addEntry}
        className="w-full border border-dashed border-slate-400 rounded-lg py-2 text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600"
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
