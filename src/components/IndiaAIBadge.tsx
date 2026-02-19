interface IndiaAIBadgeProps {
  size?: number;
  className?: string;
}

export const IndiaAIBadge = ({ size = 48, className = "" }: IndiaAIBadgeProps) => {
  const center = size / 2;
  const spokeLength = size * 0.42;
  const innerRadius = size * 0.12;

  // 24 spokes like Ashoka Chakra, alternating colors reflecting diversity
  const spokeColors = [
    "#FF9933", // saffron
    "#138808", // deep green
    "#000080", // navy blue
    "hsl(142, 76%, 36%)", // brand green
    "#FF9933",
    "#138808",
    "#000080",
    "hsl(142, 76%, 36%)",
    "#FF9933",
    "#138808",
    "#000080",
    "hsl(142, 76%, 36%)",
    "#FF9933",
    "#138808",
    "#000080",
    "hsl(142, 76%, 36%)",
    "#FF9933",
    "#138808",
    "#000080",
    "hsl(142, 76%, 36%)",
    "#FF9933",
    "#138808",
    "#000080",
    "hsl(142, 76%, 36%)",
  ];

  const spokes = Array.from({ length: 24 }, (_, i) => {
    const angle = (i * 360) / 24;
    const rad = (angle * Math.PI) / 180;
    const x1 = center + Math.cos(rad) * innerRadius;
    const y1 = center + Math.sin(rad) * innerRadius;
    const x2 = center + Math.cos(rad) * spokeLength;
    const y2 = center + Math.sin(rad) * spokeLength;
    return { x1, y1, x2, y2, color: spokeColors[i] };
  });

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="india-ai-badge"
        aria-hidden="true"
      >
        <style>{`
          .india-ai-badge {
            animation: india-ai-rotate 60s linear infinite;
          }
          .india-ai-center {
            animation: india-ai-pulse 3s ease-in-out infinite;
          }
          @keyframes india-ai-rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes india-ai-pulse {
            0%, 100% { opacity: 0.12; }
            50% { opacity: 0.08; }
          }
        `}</style>

        {/* Radiating spokes */}
        {spokes.map((s, i) => (
          <line
            key={i}
            x1={s.x1}
            y1={s.y1}
            x2={s.x2}
            y2={s.y2}
            stroke={s.color}
            strokeWidth={size < 56 ? 0.8 : 1}
            opacity={0.15}
            strokeLinecap="round"
          />
        ))}

        {/* Central Chakra circle */}
        <circle
          cx={center}
          cy={center}
          r={innerRadius}
          fill="none"
          stroke="#000080"
          strokeWidth={size < 56 ? 0.6 : 0.8}
          opacity={0.12}
          className="india-ai-center"
        />

        {/* Inner dot */}
        <circle
          cx={center}
          cy={center}
          r={size * 0.03}
          fill="#FF9933"
          opacity={0.15}
          className="india-ai-center"
        />
      </svg>
    </div>
  );
};
