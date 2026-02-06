import { useEffect, useState } from "react";

interface CindaLogoAnimatedProps {
  isAnimating: boolean;
  className?: string;
}

// Direction vectors for each clock position (outward from center)
const SEGMENT_DIRECTIONS: Record<number, { x: number; y: number }> = {
  12: { x: 0, y: -1 },
  1: { x: 0.5, y: -0.87 },
  2: { x: 0.87, y: -0.5 },
  3: { x: 1, y: 0 },
  4: { x: 0.87, y: 0.5 },
  5: { x: 0.5, y: 0.87 },
  6: { x: 0, y: 1 },
  7: { x: -0.5, y: 0.87 },
  8: { x: -0.87, y: 0.5 },
  9: { x: -1, y: 0 },
  10: { x: -0.87, y: -0.5 },
  11: { x: -0.5, y: -0.87 },
};

// Animation order: 12 → 1 → 2 → ... → 11
const ANIMATION_ORDER = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

// Distance to move outward (in SVG units)
const EXPLODE_DISTANCE = 25;

// Animation timing
const SEGMENT_DURATION = 800; // ms per segment
const STAGGER_DELAY = 50; // ms between each segment start

export function CindaLogoAnimated({ isAnimating, className = "" }: CindaLogoAnimatedProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPrefersReducedMotion(
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    }
  }, []);

  const getSegmentStyle = (clockPosition: number): React.CSSProperties => {
    if (!isAnimating || prefersReducedMotion) {
      return {};
    }

    const direction = SEGMENT_DIRECTIONS[clockPosition];
    const orderIndex = ANIMATION_ORDER.indexOf(clockPosition);
    const delay = orderIndex * STAGGER_DELAY;

    return {
      "--tx": `${direction.x * EXPLODE_DISTANCE}px`,
      "--ty": `${direction.y * EXPLODE_DISTANCE}px`,
      animation: `segment-explode ${SEGMENT_DURATION}ms cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms forwards`,
    } as React.CSSProperties;
  };

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      aria-label="Cinda"
      role="img"
    >
      <style>{`
        @keyframes segment-explode {
          0% {
            transform: translate(0, 0);
            opacity: 1;
          }
          40% {
            transform: translate(var(--tx), var(--ty));
            opacity: 0.7;
          }
          100% {
            transform: translate(0, 0);
            opacity: 1;
          }
        }
      `}</style>
      
      {/* 12 o'clock segment */}
      <path
        d="M50 10 L50 25 L55 25 L55 15 Q52.5 10 50 10"
        fill="#9ca3af"
        style={getSegmentStyle(12)}
      />
      
      {/* 1 o'clock segment */}
      <path
        d="M55 15 L60 18 L65 28 L58 30 L55 25 L55 15"
        fill="#9ca3af"
        style={getSegmentStyle(1)}
      />
      
      {/* 2 o'clock segment */}
      <path
        d="M65 28 L75 38 L70 45 L62 38 L58 30"
        fill="#9ca3af"
        style={getSegmentStyle(2)}
      />
      
      {/* 3 o'clock segment */}
      <path
        d="M75 45 L90 50 L75 55 L70 55 L70 45"
        fill="#9ca3af"
        style={getSegmentStyle(3)}
      />
      
      {/* 4 o'clock segment */}
      <path
        d="M75 55 L75 62 L65 72 L62 62 L70 55"
        fill="#9ca3af"
        style={getSegmentStyle(4)}
      />
      
      {/* 5 o'clock segment */}
      <path
        d="M65 72 L60 82 L55 85 L55 75 L58 70 L62 62"
        fill="#9ca3af"
        style={getSegmentStyle(5)}
      />
      
      {/* 6 o'clock segment */}
      <path
        d="M55 85 L50 90 L45 85 L45 75 L50 75 L55 75"
        fill="#9ca3af"
        style={getSegmentStyle(6)}
      />
      
      {/* 7 o'clock segment */}
      <path
        d="M45 85 L40 82 L35 72 L38 62 L42 70 L45 75"
        fill="#9ca3af"
        style={getSegmentStyle(7)}
      />
      
      {/* 8 o'clock segment */}
      <path
        d="M35 72 L25 62 L25 55 L30 55 L38 62"
        fill="#9ca3af"
        style={getSegmentStyle(8)}
      />
      
      {/* 9 o'clock segment */}
      <path
        d="M25 55 L10 50 L25 45 L30 45 L30 55"
        fill="#9ca3af"
        style={getSegmentStyle(9)}
      />
      
      {/* 10 o'clock segment */}
      <path
        d="M25 45 L25 38 L35 28 L38 38 L30 45"
        fill="#9ca3af"
        style={getSegmentStyle(10)}
      />
      
      {/* 11 o'clock segment */}
      <path
        d="M35 28 L40 18 L45 15 L45 25 L42 30 L38 38"
        fill="#9ca3af"
        style={getSegmentStyle(11)}
      />
      
      {/* Inner ring/center */}
      <circle cx="50" cy="50" r="20" fill="none" stroke="#9ca3af" strokeWidth="3" />
    </svg>
  );
}

export default CindaLogoAnimated;
