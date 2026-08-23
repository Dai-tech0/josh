"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import type {
  CustomPauseRange,
  FamilyDefaults,
  HomeworkTask,
  TaskPriority,
  TaskType,
  TaskUnit,
} from "@/lib/types";
import { newCustomRange } from "@/lib/allocation";
import { addDays, todayISO } from "@/lib/date";

const UNITS: TaskUnit[] = ["ページ", "問", "個", "分", "回", "冊"];
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export default function TaskForm({
  childId,
  initial,
  defaults,
  onDone,
}: {
  childId: string;
  initial?: HomeworkTask;
  /** 新規作成時のみ使用する家族共通デフォルト設定（編集時は既存値を優先） */
  defaults?: FamilyDefaults;
  onDone?: () => void;
}) {
  const { addTask, updateTask } = useStore();
  const router = useRouter();

  const [name, setName] = useState(initial?.name ?? "");
  const [totalAmount, setTotalAmount] = useState(initial?.totalAmount ?? 10);
  const [unit, setUnit] = useState<TaskUnit>(initial?.unit ?? "ページ");
  const [priority, setPriority] = useState<TaskPriority>(
    initial?.priority ?? defaults?.priority ?? "mid"
  );
  const [type, setType] = useState<TaskType>(initial?.type ?? "amount");
  const [startDate, setStartDate] = useState(
    initial?.startDate ?? defaults?.startDate ?? todayISO()
  );
  const [endDate, setEndDate] = useState(
    initial?.endDate ?? defaults?.endDate ?? addDays(todayISO(), 13)
  );
  const [weeklyDays, setWeeklyDays] = useState<number[]>(
    initial?.pauseRule.weeklyDays ?? defaults?.pauseRule.weeklyDays ?? []
  );
  const [customRanges, setCustomRanges] = useState<CustomPauseRange[]>(
    initial?.pauseRule.customRanges ?? defaults?.pauseRule.customRanges ?? []
  );
  const [rangeLabel, setRangeLabel] = useState("");
  const [rangeStart, setRangeStart] = useState(todayISO());
  const [rangeEnd, setRangeEnd] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);

  function toggleWeekday(d: number) {
    setWeeklyDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  function addRange() {
    if (!rangeLabel.trim()) return;
    if (rangeStart > rangeEnd) {
      setError("休止期間の開始日は終了日より前にしてください。");
      return;
    }
    setCustomRanges((prev) => [...prev, newCustomRange(rangeLabel.trim(), rangeStart, rangeEnd)]);
    setRangeLabel("");
  }

  function removeRange(id: string) {
    setCustomRanges((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("課題名を入力してください。");
    if (totalAmount <= 0) return setError("総量は1以上にしてください。");
    if (startDate > endDate) return setError("開始日は終了日より前にしてください。");

    const pauseRule = { weeklyDays, customRanges };

    if (initial) {
      await updateTask(initial.id, {
        name: name.trim(),
        totalAmount,
        unit,
        priority,
        type,
        startDate,
        endDate,
        pauseRule,
        extendedEndDate: undefined,
      });
      onDone?.();
    } else {
      const created = await addTask({
        childId,
        name: name.trim(),
        totalAmount,
        unit,
        priority,
        type,
        startDate,
        endDate,
        pauseRule,
      });
      router.push(`/tasks/${created.id}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">課題名</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 算数ドリル"
          className="w-full border border-slate-400 rounded px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">総量</label>
          <input
            type="number"
            min={1}
            value={totalAmount}
            onChange={(e) => setTotalAmount(Number(e.target.value))}
            className="w-full border border-slate-400 rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">単位</label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as TaskUnit)}
            className="w-full border border-slate-400 rounded px-3 py-2 text-sm bg-white"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">優先度</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="w-full border border-slate-400 rounded px-3 py-2 text-sm bg-white"
          >
            <option value="high">高</option>
            <option value="mid">中</option>
            <option value="low">低</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">課題タイプ</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TaskType)}
            className="w-full border border-slate-400 rounded px-3 py-2 text-sm bg-white"
          >
            <option value="amount">総量型（日割り。例: ドリル◯ページ）</option>
            <option value="count">個数型（週割り。例: 感想文◯個）</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">開始日</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-slate-400 rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">終了日</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-slate-400 rounded px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-2">
          休止日（繰り返し・毎週）
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {WEEKDAYS.map((label, idx) => (
            <button
              type="button"
              key={idx}
              onClick={() => toggleWeekday(idx)}
              className={`w-9 h-9 rounded-full text-sm border transition ${
                weeklyDays.includes(idx)
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
        {customRanges.length > 0 && (
          <ul className="space-y-1 mb-2">
            {customRanges.map((r) => (
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
        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={rangeLabel}
            onChange={(e) => setRangeLabel(e.target.value)}
            placeholder="ラベル（例: 旅行）"
            className="border border-slate-400 rounded px-2 py-1.5 text-sm w-32"
          />
          <input
            type="date"
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            className="border border-slate-400 rounded px-2 py-1.5 text-sm"
          />
          <span className="text-slate-500 text-sm">〜</span>
          <input
            type="date"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
            className="border border-slate-400 rounded px-2 py-1.5 text-sm"
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

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          className="bg-indigo-600 text-white text-sm px-4 py-2 rounded hover:bg-indigo-700"
        >
          {initial ? "更新する" : "課題を登録する"}
        </button>
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="text-sm px-4 py-2 rounded text-slate-500 hover:bg-slate-100"
          >
            キャンセル
          </button>
        )}
      </div>
    </form>
  );
}
