import { useEffect, useState } from "react";

interface AnimatedTaglineProps {
  className?: string;
}

const AnimatedTagline = ({ className = "" }: AnimatedTaglineProps) => {
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [driftActive, setDriftActive] = useState(false);
  
  const prefersReducedMotion = typeof window !== "undefined" && 
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const lines = [
    "Every runner deserves",
    "to find their perfect fit."
  ];

  useEffect(() => {
    const timer = setTimeout(() => setShouldAnimate(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Start drift animation after fade-in completes
  useEffect(() => {
    if (!shouldAnimate || prefersReducedMotion) return;
    
    const driftTimer = setTimeout(() => setDriftActive(true), 1000);
    return () => clearTimeout(driftTimer);
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
            className="block"
            style={{ 
              fontSize: "28px", 
              fontWeight: 900,
              fontStyle: "italic"
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
          ...(driftActive ? { animation: "drift-gentle 20s ease-in-out infinite" } : {})
        }}
      >
        {lines.map((line, i) => (
          <span
            key={i}
            className={`block transition-all duration-700 ease-out ${
              shouldAnimate 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-4"
            }`}
            style={{ 
              transitionDelay: `${i * 200}ms`,
              fontSize: "28px",
              fontWeight: 900,
              fontStyle: "italic"
            }}
          >
            {line}
          </span>
        ))}
      </h1>

      {/* Drift keyframes - slow, organic, multi-directional movement */}
      <style>{`
        @keyframes drift-gentle {
          0%, 100% {
            transform: translate(0px, 0px);
          }
          20% {
            transform: translate(3px, -4px);
          }
          40% {
            transform: translate(-2px, -2px);
          }
          60% {
            transform: translate(-4px, 3px);
          }
          80% {
            transform: translate(2px, 2px);
          }
        }
      `}</style>
    </>
  );
};

export default AnimatedTagline;