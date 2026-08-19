/** 赤・躍動感を意識したYattaのロゴタイプ */
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 130 48"
      className={className}
      role="img"
      aria-label="Yatta"
    >
      <path
        d="M6 41 Q 56 47 116 38"
        stroke="#FCA5A5"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <text
        x="4"
        y="33"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight="900"
        fontSize="32"
        fill="#DC2626"
        transform="skewX(-8)"
      >
        Yatta
      </text>
      <text
        x="78"
        y="30"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight="900"
        fontSize="30"
        fill="#DC2626"
        transform="rotate(16 88 20)"
      >
        !
      </text>
    </svg>
  );
}
