"use client";

import { tokenizeFurigana, useFurigana } from "@/lib/furigana";

/**
 * 子供アカウントで「ふりがな表示」がオンのときだけ、漢字の上にルビを振って表示する。
 * オフ・保護者ログイン時などは通常のテキストとしてそのまま表示する。
 */
export default function FuriganaText({ text }: { text: string }) {
  const enabled = useFurigana();
  if (!enabled) return <>{text}</>;

  const tokens = tokenizeFurigana(text);
  return (
    <>
      {tokens.map((t, i) =>
        t.reading ? (
          <ruby key={i}>
            {t.text}
            <rt className="text-[0.6em] text-slate-500">{t.reading}</rt>
          </ruby>
        ) : (
          <span key={i}>{t.text}</span>
        )
      )}
    </>
  );
}
