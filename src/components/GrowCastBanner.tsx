const GROWCAST_URL = "https://my-tv-six-smoky.vercel.app";

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="url(#gc-grad)" />
      <path d="M16 12.5 L28 20 L16 27.5 Z" fill="white" />
      <defs>
        <linearGradient id="gc-grad" x1="0" y1="0" x2="40" y2="40">
          <stop offset="0" stopColor="#2dd4bf" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** 姉妹サービス GrowCast への誘導バナー。ログイン前は小さく、ログイン後は少し大きく目立たせる */
export default function GrowCastBanner({ size }: { size: "sm" | "lg" }) {
  if (size === "sm") {
    return (
      <a
        href={GROWCAST_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 border border-slate-200 rounded-lg bg-white px-4 py-3 hover:border-teal-300 transition"
      >
        <PlayIcon className="w-9 h-9 shrink-0" />
        <p className="flex-1 min-w-0 text-sm text-slate-700">
          <span className="font-bold text-slate-800">GrowCast</span> — 学びたい動画を、自分だけの
          <span className="font-bold text-teal-700">放送局</span>に📺
        </p>
        <span className="text-xs font-medium text-teal-600 shrink-0">見てみる →</span>
      </a>
    );
  }

  return (
    <a
      href={GROWCAST_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-4 border border-slate-200 rounded-lg bg-gradient-to-r from-teal-50 to-blue-50 px-5 py-3.5 hover:border-teal-300 transition"
    >
      <PlayIcon className="w-10 h-10 shrink-0" />
      <p className="flex-1 min-w-0 text-sm text-slate-700">
        <span className="font-bold text-slate-800">GrowCast</span> — 学びたい動画を、自分だけの
        <span className="font-bold text-teal-700">放送局</span>に📺
      </p>
      <span className="text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-full px-4 py-2 shrink-0 whitespace-nowrap transition">
        見てみる →
      </span>
    </a>
  );
}
