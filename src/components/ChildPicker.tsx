"use client";

import { useStore } from "@/lib/store";

export default function ChildPicker() {
  const { data, selectChild } = useStore();

  return (
    <div className="space-y-4 max-w-sm">
      <div>
        <h1 className="text-xl font-bold">誰の宿題？</h1>
        <p className="text-sm text-slate-500 mt-1">自分の名前を選んでください。</p>
      </div>
      {data.children.length === 0 ? (
        <p className="text-sm text-slate-400">
          まだ子供アカウントがありません。保護者に追加してもらってください。
        </p>
      ) : (
        <div className="space-y-2">
          {data.children.map((c) => (
            <button
              key={c.id}
              onClick={() => selectChild(c.id)}
              className="w-full text-left border border-slate-200 rounded-lg bg-white px-4 py-3 hover:border-indigo-400 font-medium"
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
