/** 赤・躍動感を意識したYattaのロゴタイプ */
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 145 48"
      className={className}
      role="img"
      aria-label="Yatta"
    >
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
      <text x="78" y="34" fontSize="24">
        🙌
      </text>
      <text
        x="117"
        y="30"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight="900"
        fontSize="30"
        fill="#DC2626"
        transform="rotate(16 127 20)"
      >
        !
      </text>
    </svg>
  );
}
