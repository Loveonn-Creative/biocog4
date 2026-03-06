interface IndiaAIBadgeProps {
  size?: number;
  className?: string;
}

export const IndiaAIBadge = ({ size = 48, className = "" }: IndiaAIBadgeProps) => {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const outerR = s * 0.42;
  const innerR = s * 0.15;
  const chakraR = s * 0.10;

  const id = `india-spoke-${size}`;

  // 24 radiating spokes
  const spokes = Array.from({ length: 24 }, (_, i) => {
    const angle = (i * 360) / 24;
    const rad = (angle * Math.PI) / 180;
    const x1 = cx + Math.cos(rad) * innerR;
    const y1 = cy + Math.sin(rad) * innerR;
    const x2 = cx + Math.cos(rad) * outerR;
    const y2 = cy + Math.sin(rad) * outerR;
    return { x1, y1, x2, y2, angle };
  });

  // 24 mini Ashoka Chakra spokes in center
  const chakraSpokes = Array.from({ length: 24 }, (_, i) => {
    const angle = (i * 360) / 24;
    const rad = (angle * Math.PI) / 180;
    const x1 = cx + Math.cos(rad) * (chakraR * 0.25);
    const y1 = cy + Math.sin(rad) * (chakraR * 0.25);
    const x2 = cx + Math.cos(rad) * chakraR;
    const y2 = cy + Math.sin(rad) * chakraR;
    return { x1, y1, x2, y2 };
  });

  const spokeColors = ['#FF9933', '#138808', '#000080', 'hsl(142, 76%, 36%)'];

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <svg
        width={s}
        height={s}
        viewBox={`0 0 ${s} ${s}`}
        aria-hidden="true"
        className="india-spoke-badge"
      >
        <defs>
          <linearGradient id={`${id}-saffron`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF9933" />
            <stop offset="100%" stopColor="#FFD700" />
          </linearGradient>
          <linearGradient id={`${id}-green`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#138808" />
            <stop offset="100%" stopColor="#0D9488" />
          </linearGradient>
          <linearGradient id={`${id}-navy`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#000080" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>
          <linearGradient id={`${id}-brand`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(142, 76%, 36%)" />
            <stop offset="100%" stopColor="hsl(160, 60%, 45%)" />
          </linearGradient>
        </defs>

        <style>{`
          .india-spoke-badge {
            filter: drop-shadow(0 0 ${s * 0.03}px rgba(255, 153, 51, 0.4));
          }
          .spoke-group {
            animation: spoke-rotate 60s linear infinite;
            transform-origin: ${cx}px ${cy}px;
          }
          .chakra-center {
            animation: chakra-spin 30s linear infinite;
            transform-origin: ${cx}px ${cy}px;
          }
          .chakra-pulse {
            animation: chakra-pulse 3s ease-in-out infinite;
            transform-origin: ${cx}px ${cy}px;
          }
          @keyframes spoke-rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes chakra-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(-360deg); }
          }
          @keyframes chakra-pulse {
            0%, 100% { transform: scale(1); opacity: 0.85; }
            50% { transform: scale(1.12); opacity: 1; }
          }
        `}</style>

        {/* Radiating spokes */}
        <g className="spoke-group">
          {spokes.map((sp, i) => (
            <line
              key={i}
              x1={sp.x1}
              y1={sp.y1}
              x2={sp.x2}
              y2={sp.y2}
              stroke={`url(#${id}-${['saffron', 'green', 'navy', 'brand'][i % 4]})`}
              strokeWidth={s * 0.02}
              strokeLinecap="round"
              opacity={0.8}
            />
          ))}
        </g>

        {/* Center Ashoka Chakra wheel */}
        <g className="chakra-pulse">
          {/* Outer ring */}
          <circle
            cx={cx}
            cy={cy}
            r={chakraR}
            fill="none"
            stroke="#000080"
            strokeWidth={s * 0.015}
            opacity={0.9}
          />
          {/* Inner ring */}
          <circle
            cx={cx}
            cy={cy}
            r={chakraR * 0.3}
            fill="#000080"
            opacity={0.85}
          />
        </g>

        {/* Chakra mini-spokes (rotate independently) */}
        <g className="chakra-center">
          {chakraSpokes.map((sp, i) => (
            <line
              key={`cs-${i}`}
              x1={sp.x1}
              y1={sp.y1}
              x2={sp.x2}
              y2={sp.y2}
              stroke={i % 3 === 0 ? '#FF9933' : i % 3 === 1 ? '#138808' : '#000080'}
              strokeWidth={s * 0.012}
              strokeLinecap="round"
              opacity={0.9}
            />
          ))}
        </g>
      </svg>
    </div>
  );
};
