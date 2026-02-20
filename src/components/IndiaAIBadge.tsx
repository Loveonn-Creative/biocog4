interface IndiaAIBadgeProps {
  size?: number;
  className?: string;
}

export const IndiaAIBadge = ({ size = 48, className = "" }: IndiaAIBadgeProps) => {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const petalR = s * 0.38; // petal reach
  const eyeR = s * 0.12;

  // 8 petals, each a quadratic bezier "leaf" shape
  const petals = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * 360) / 8;
    const rad = (angle * Math.PI) / 180;
    const tipX = cx + Math.cos(rad) * petalR;
    const tipY = cy + Math.sin(rad) * petalR;
    
    // Control points for the curved petal shape
    const spread = 0.35; // how wide the petal opens
    const leftRad = ((angle - 25) * Math.PI) / 180;
    const rightRad = ((angle + 25) * Math.PI) / 180;
    const cpDist = petalR * 0.7;
    
    const cp1X = cx + Math.cos(leftRad) * cpDist;
    const cp1Y = cy + Math.sin(leftRad) * cpDist;
    const cp2X = cx + Math.cos(rightRad) * cpDist;
    const cp2Y = cy + Math.sin(rightRad) * cpDist;
    
    const path = `M ${cx} ${cy} Q ${cp1X} ${cp1Y} ${tipX} ${tipY} Q ${cp2X} ${cp2Y} ${cx} ${cy} Z`;
    
    return { path, angle, tipX, tipY };
  });

  // Gradient IDs unique per instance
  const id = `lotus-${size}`;

  // Synapse connections between alternate petal tips
  const synapses = petals.map((p, i) => {
    const next = petals[(i + 1) % 8];
    const midX = (p.tipX + next.tipX) / 2 + (Math.random() - 0.5) * s * 0.05;
    const midY = (p.tipY + next.tipY) / 2 + (Math.random() - 0.5) * s * 0.05;
    return `M ${p.tipX} ${p.tipY} Q ${midX} ${midY} ${next.tipX} ${next.tipY}`;
  });

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <svg
        width={s}
        height={s}
        viewBox={`0 0 ${s} ${s}`}
        aria-hidden="true"
        className="india-lotus-badge"
      >
        <defs>
          {/* Saffron-to-Gold */}
          <linearGradient id={`${id}-saffron`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF9933" />
            <stop offset="100%" stopColor="#FFD700" />
          </linearGradient>
          {/* Green-to-Teal */}
          <linearGradient id={`${id}-green`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#138808" />
            <stop offset="100%" stopColor="#0D9488" />
          </linearGradient>
          {/* Navy-to-Indigo */}
          <linearGradient id={`${id}-navy`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#000080" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>
          {/* Brand green */}
          <linearGradient id={`${id}-brand`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(142, 76%, 36%)" />
            <stop offset="100%" stopColor="hsl(160, 60%, 45%)" />
          </linearGradient>
          {/* Eye gradient */}
          <radialGradient id={`${id}-eye`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFD700" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#FF9933" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#000080" stopOpacity="0.5" />
          </radialGradient>
        </defs>

        <style>{`
          .india-lotus-badge {
            filter: drop-shadow(0 0 ${s * 0.02}px rgba(255, 153, 51, 0.3));
          }
          .lotus-petals {
            animation: lotus-breathe 4s ease-in-out infinite;
            transform-origin: ${cx}px ${cy}px;
          }
          .lotus-synapse {
            stroke-dasharray: ${s * 0.15};
            stroke-dashoffset: ${s * 0.3};
            animation: synapse-flow 8s linear infinite;
          }
          .lotus-eye-outer {
            animation: eye-pulse 3s ease-in-out infinite;
            transform-origin: ${cx}px ${cy}px;
          }
          .lotus-eye-inner {
            animation: eye-pulse 3s ease-in-out infinite reverse;
            transform-origin: ${cx}px ${cy}px;
          }
          @keyframes lotus-breathe {
            0%, 100% { transform: scale(0.97); }
            50% { transform: scale(1.03); }
          }
          @keyframes synapse-flow {
            to { stroke-dashoffset: 0; }
          }
          @keyframes eye-pulse {
            0%, 100% { transform: scale(1); opacity: 0.85; }
            50% { transform: scale(1.1); opacity: 1; }
          }
        `}</style>

        {/* Petals group with breathing animation */}
        <g className="lotus-petals">
          {petals.map((p, i) => {
            const gradients = [`${id}-saffron`, `${id}-green`, `${id}-navy`, `${id}-brand`];
            const fill = `url(#${gradients[i % 4]})`;
            return (
              <path
                key={i}
                d={p.path}
                fill={fill}
                opacity={0.75}
                stroke="none"
              />
            );
          })}
        </g>

        {/* Neural synapses connecting petal tips */}
        {synapses.map((d, i) => (
          <path
            key={`syn-${i}`}
            d={d}
            fill="none"
            stroke={i % 2 === 0 ? "#FF9933" : "#138808"}
            strokeWidth={s * 0.012}
            opacity={0.6}
            className="lotus-synapse"
            style={{ animationDelay: `${i * 0.5}s` }}
          />
        ))}

        {/* Center: Geometric "AI Eye" */}
        {/* Outer arc (top) */}
        <path
          d={`M ${cx - eyeR} ${cy} Q ${cx} ${cy - eyeR * 1.6} ${cx + eyeR} ${cy}`}
          fill="none"
          stroke="#000080"
          strokeWidth={s * 0.02}
          opacity={0.8}
          className="lotus-eye-outer"
        />
        {/* Outer arc (bottom) */}
        <path
          d={`M ${cx - eyeR} ${cy} Q ${cx} ${cy + eyeR * 1.6} ${cx + eyeR} ${cy}`}
          fill="none"
          stroke="#138808"
          strokeWidth={s * 0.02}
          opacity={0.8}
          className="lotus-eye-outer"
        />
        {/* Inner iris */}
        <circle
          cx={cx}
          cy={cy}
          r={eyeR * 0.5}
          fill={`url(#${id}-eye)`}
          className="lotus-eye-inner"
        />
        {/* Pupil dot */}
        <circle
          cx={cx}
          cy={cy}
          r={eyeR * 0.2}
          fill="#000080"
          opacity={0.9}
          className="lotus-eye-inner"
        />
      </svg>
    </div>
  );
};