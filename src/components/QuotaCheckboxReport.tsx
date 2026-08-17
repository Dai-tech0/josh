"use client";

import { useState } from "react";

/**
 * チェックボックス式の実績報告UI。
 * チェックのみ = ノルマちょうど達成。ノルマ以上できた場合は数値入力に切り替えられる。
 * 未チェックのまま何もしなければ「未達成」として扱われる（自動判定、明示的な操作は不要）。
 */
export default function QuotaCheckboxReport({
  plannedAmount,
  unit,
  existingDoneAmount,
  onSubmit,
}: {
  plannedAmount: number;
  unit: string;
  existingDoneAmount: number | null;
  onSubmit: (amount: number) => void;
}) {
  const initialOverride = existingDoneAmount !== null && existingDoneAmount !== plannedAmount;
  const [overrideMode, setOverrideMode] = useState(initialOverride);
  const [checked, setChecked] = useState(existingDoneAmount === plannedAmount);
  const [overrideValue, setOverrideValue] = useState(existingDoneAmount ?? plannedAmount + 1);
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = overrideMode ? overrideValue : checked ? plannedAmount : null;
    if (amount === null) return;
    onSubmit(amount);
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {!overrideMode ? (
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => {
                setChecked(e.target.checked);
                setSaved(false);
              }}
              className="w-5 h-5 accent-indigo-600"
            />
            今日のノルマ（{plannedAmount}
            {unit}）を達成した
          </label>
          <button
            type="button"
            onClick={() => {
              setOverrideMode(true);
              setOverrideValue(existingDoneAmount ?? plannedAmount + 1);
              setSaved(false);
            }}
            className="text-xs text-indigo-600 hover:underline"
          >
            {plannedAmount}
            {unit}以上できた場合はこちら
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm text-slate-600">
            実際にできた量（{unit}）
          </label>
          <input
            type="number"
            min={0}
            value={overrideValue}
            onChange={(e) => {
              setOverrideValue(Number(e.target.value));
              setSaved(false);
            }}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm w-24"
          />
          <button
            type="button"
            onClick={() => {
              setOverrideMode(false);
              setSaved(false);
            }}
            className="text-xs text-slate-400 hover:underline"
          >
            チェックに戻る
          </button>
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="bg-indigo-600 text-white text-sm px-4 py-1.5 rounded hover:bg-indigo-700"
        >
          報告する
        </button>
        {saved && <span className="text-xs text-emerald-600">報告しました</span>}
      </div>
    </form>
  );
}
