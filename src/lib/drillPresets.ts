import type { TaskType, TaskUnit } from "./types";

export type DrillCategory =
  | "elementary"
  | "elementaryExam"
  | "juniorHigh"
  | "juniorHighExam"
  | "freeInput";

export const DRILL_CATEGORY_LABEL: Record<DrillCategory, string> = {
  elementary: "小学生",
  elementaryExam: "小学受験",
  juniorHigh: "中学生",
  juniorHighExam: "中学受験",
  freeInput: "自由入力（高校生・大人）",
};

export const DRILL_CATEGORIES: DrillCategory[] = [
  "elementary",
  "elementaryExam",
  "juniorHigh",
  "juniorHighExam",
  "freeInput",
];

export interface DrillPreset {
  unit: TaskUnit;
  type: TaskType;
  amountLabel: string;
}

function page(): DrillPreset {
  return { unit: "ページ", type: "amount", amountLabel: "ページ数" };
}

// 年齢帯ごとのドリル候補。総量型（ページ）を基本とし、個数・プロジェクト系のみ個数型（週割り）にする
export const DRILL_PRESETS: Record<DrillCategory, Record<string, DrillPreset>> = {
  elementary: {
    算数ドリル: page(),
    国語ドリル: page(),
    社会ドリル: page(),
    理科ドリル: page(),
    漢字練習: page(),
    計算練習: page(),
    自主学習ノート: page(),
    読書感想文: { unit: "個", type: "count", amountLabel: "個数" },
    日記: { unit: "回", type: "amount", amountLabel: "回数" },
    自由研究: { unit: "個", type: "count", amountLabel: "個数" },
  },
  elementaryExam: {
    数量ドリル: page(),
    図形ドリル: page(),
    言語ドリル: page(),
    常識ドリル: page(),
    推理ドリル: page(),
    記憶ドリル: page(),
    巧緻性ドリル: { unit: "回", type: "amount", amountLabel: "回数" },
    観察力ドリル: page(),
    お話の記憶ドリル: { unit: "回", type: "amount", amountLabel: "回数" },
    "季節・行事ドリル": page(),
    生活常識ドリル: page(),
    ペーパーテスト対策ドリル: page(),
  },
  juniorHigh: {
    数学ドリル: page(),
    "漢字・国語ドリル": page(),
    英語ドリル: page(),
    理科ドリル: page(),
    社会ドリル: page(),
    文法ドリル: page(),
    英単語ドリル: page(),
    計算ドリル: page(),
    語彙ドリル: page(),
    歴史ドリル: page(),
    地理ドリル: page(),
    公民ドリル: page(),
  },
  juniorHighExam: {
    算数ドリル: page(),
    国語ドリル: page(),
    理科ドリル: page(),
    社会ドリル: page(),
    計算ドリル: page(),
    漢字ドリル: page(),
    語彙ドリル: page(),
    文章読解ドリル: page(),
    図形ドリル: page(),
    地理ドリル: page(),
    歴史ドリル: page(),
    公民ドリル: page(),
    "理科実験・観察ドリル": page(),
    過去問演習: { unit: "回", type: "count", amountLabel: "回数" },
    志望校対策ドリル: page(),
  },
  freeInput: {},
};

/** 子供の年齢から、最初に開くドリルカテゴリーを決める（あくまで初期値。手動で切り替え可能） */
export function defaultDrillCategoryForAge(age: number | undefined): DrillCategory {
  if (age === undefined) return "elementary";
  if (age <= 6) return "elementaryExam";
  if (age <= 11) return "elementary";
  if (age <= 14) return "juniorHigh";
  return "freeInput"; // 高校生・大人はカテゴリーを決め打ちせず自由入力から始める
}
