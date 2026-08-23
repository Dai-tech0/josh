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
        <p className="text-sm text-slate-500">
          まだ子供アカウントがありません。保護者に追加してもらってください。
        </p>
      ) : (
        <div className="space-y-3">
          {data.children.map((c) => (
            <button
              key={c.id}
              onClick={() => selectChild(c.id)}
              className="w-full text-left border-2 border-slate-200 rounded-xl bg-white px-5 py-4 hover:border-indigo-400 text-lg font-semibold"
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
