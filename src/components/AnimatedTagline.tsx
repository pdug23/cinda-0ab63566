import { useEffect, useState } from "react";

interface AnimatedTaglineProps {
  className?: string;
}

const AnimatedTagline = ({ className = "" }: AnimatedTaglineProps) => {
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [rippleActive, setRippleActive] = useState(false);
  
  const prefersReducedMotion = typeof window !== "undefined" && 
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const lines = [
    "Every runner",
    "deserves",
    "to find their",
    "perfect fit."
  ];

  useEffect(() => {
    const timer = setTimeout(() => setShouldAnimate(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Start ripple animation after fade-in completes
  useEffect(() => {
    if (!shouldAnimate || prefersReducedMotion) return;
    
    const rippleTimer = setTimeout(() => setRippleActive(true), 1000);
    return () => clearTimeout(rippleTimer);
  }, [shouldAnimate, prefersReducedMotion]);

  if (prefersReducedMotion) {
    return (
      <h1 
        className={`flex flex-col items-center ${className}`}
        style={{ fontVariantLigatures: "none", lineHeight: 1.2 }}
      >
        {lines.map((line, i) => (
          <span
            key={i}
            className="block whitespace-nowrap"
            style={{ 
              fontSize: "clamp(28px, 8vw, 40px)", 
              fontWeight: 900,
              fontStyle: "italic",
              WebkitTextStroke: "0.5px currentColor"
            }}
          >
            {line}
          </span>
        ))}
      </h1>
    );
  }

  return (
    <>
      <h1 
        className={`flex flex-col items-center ${className}`}
        style={{ 
          fontVariantLigatures: "none",
          lineHeight: 1.2,
          transformOrigin: "center center",
          ...(rippleActive ? { animation: "subtle-shimmer 6s ease-in-out infinite" } : {})
        }}
      >
        {lines.map((line, i) => (
          <span
            key={i}
            className={`block whitespace-nowrap transition-all duration-700 ease-out ${
              shouldAnimate 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-4"
            }`}
            style={{ 
              fontSize: "clamp(28px, 8vw, 40px)",
              fontWeight: 900,
              fontStyle: "italic",
              WebkitTextStroke: "0.5px currentColor"
            }}
          >
            {line}
          </span>
        ))}
      </h1>

      {/* Subtle shimmer/wobble - barely perceptible but alive */}
      <style>{`
        @keyframes subtle-shimmer {
          0%, 100% {
            transform: scale(1) skew(0deg, 0deg) translateY(0);
          }
          25% {
            transform: scale(1.002) skew(0.08deg, 0.04deg) translateY(-0.3px);
          }
          50% {
            transform: scale(0.998) skew(-0.06deg, -0.03deg) translateY(0.3px);
          }
          75% {
            transform: scale(1.001) skew(0.04deg, 0.02deg) translateY(-0.15px);
          }
        }
      `}</style>
    </>
  );
};

export default AnimatedTagline;