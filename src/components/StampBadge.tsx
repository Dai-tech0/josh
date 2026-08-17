import type { AchievementTier } from "@/lib/types";
import { ACHIEVEMENT_LABEL } from "@/lib/allocation";

const STAMP_STYLE: Record<AchievementTier, { bg: string; ring: string; icon: string; rotate: string }> = {
  exceeded: { bg: "bg-rose-500", ring: "ring-rose-200", icon: "🌟", rotate: "-rotate-6" },
  met: { bg: "bg-rose-500", ring: "ring-rose-200", icon: "🌸", rotate: "rotate-3" },
  missed: { bg: "bg-slate-300", ring: "ring-slate-100", icon: "🌱", rotate: "-rotate-3" },
};

/** 花丸シール風の達成度スタンプ */
export default function StampBadge({
  tier,
  size = "md",
}: {
  tier: AchievementTier;
  size?: "sm" | "md";
}) {
  const style = STAMP_STYLE[tier];
  const dimension = size === "sm" ? "w-11 h-11 text-[9px]" : "w-16 h-16 text-[10px]";

  return (
    <span
      className={`inline-flex flex-col items-center justify-center ${dimension} ${style.bg} ${style.rotate} rounded-full text-white font-bold leading-tight text-center shadow-sm ring-4 ${style.ring} border-2 border-white select-none`}
      title={ACHIEVEMENT_LABEL[tier]}
    >
      <span className={size === "sm" ? "text-sm" : "text-lg"}>{style.icon}</span>
      {size === "md" && <span className="px-1">{ACHIEVEMENT_LABEL[tier]}</span>}
    </span>
  );
}
