"use client";

import { useStore } from "./store";

/**
 * 画面文言で使う漢字の読み仮名辞書。
 * 自動変換ライブラリを使わず自前で管理することで、精度と軽さを両立する。
 * キーは長い語から先にマッチさせるため、tokenizeFurigana側でソートする。
 */
export const FURIGANA_DICT: Record<string, string> = {
  課題: "かだい",
  目標: "もくひょう",
  管理: "かんり",
  登録: "とうろく",
  編集: "へんしゅう",
  報告: "ほうこく",
  実績: "じっせき",
  達成: "たっせい",
  優先度: "ゆうせんど",
  今日: "きょう",
  今週: "こんしゅう",
  残: "のこ",
  自主学習: "じしゅがくしゅう",
  休止日: "きゅうしび",
  記録: "きろく",
  進捗: "しんちょく",
  一覧: "いちらん",
  詳細: "しょうさい",
  家族: "かぞく",
  権限: "けんげん",
  保護者: "ほごしゃ",
  管理者: "かんりしゃ",
  共有者: "きょうゆうしゃ",
  子供: "こども",
  応援: "おうえん",
  名前: "なまえ",
  選: "えら",
  自分: "じぶん",
  使: "つか",
  方: "かた",
  案内: "あんない",
  切替: "きりかえ",
  他: "ほか",
  戻: "もど",
  切: "き",
  以上: "いじょう",
  場合: "ばあい",
  実際: "じっさい",
  量: "りょう",
  週: "しゅう",
  日: "にち",
  分: "ぶん",
  頑張: "がんば",
  読書: "どくしょ",
  感想文: "かんそうぶん",
  漢字: "かんじ",
  練習: "れんしゅう",
  計算: "けいさん",
  国語: "こくご",
  算数: "さんすう",
  理科: "りか",
  社会: "しゃかい",
  英語: "えいご",
  期間: "きかん",
  今月: "こんげつ",
  来月: "らいげつ",
  前月: "ぜんげつ",
  次月: "じげつ",
  開始: "かいし",
  終了: "しゅうりょう",
  遅: "おく",
  少: "すこ",
  多: "おお",
  良: "よ",
  悪: "わる",
  全部: "ぜんぶ",
  状態: "じょうたい",
  日付: "ひづけ",
  総量: "そうりょう",
  動画: "どうが",
  得意: "とくい",
};

interface FuriganaToken {
  text: string;
  reading?: string;
}

const SORTED_KEYS = Object.keys(FURIGANA_DICT).sort((a, b) => b.length - a.length);

/** 文字列を「辞書に一致する語＋読み」と「その他の文字」に分割する */
export function tokenizeFurigana(text: string): FuriganaToken[] {
  const result: FuriganaToken[] = [];
  let i = 0;
  while (i < text.length) {
    const matchKey = SORTED_KEYS.find((key) => text.startsWith(key, i));
    if (matchKey) {
      result.push({ text: matchKey, reading: FURIGANA_DICT[matchKey] });
      i += matchKey.length;
      continue;
    }
    const last = result[result.length - 1];
    if (last && !last.reading) {
      last.text += text[i];
    } else {
      result.push({ text: text[i] });
    }
    i++;
  }
  return result;
}

/** ログイン中の子供に、ふりがな表示がオンになっているか */
export function useFurigana(): boolean {
  const { currentUser } = useStore();
  return !!(currentUser && currentUser.role === "owner" && currentUser.furiganaEnabled);
}
