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
          transformOrigin: "top left",
          ...(rippleActive ? { animation: "ripple-wave 8s ease-in-out infinite" } : {})
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
              transitionDelay: `${i * 200}ms`,
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

      {/* Ripple wave keyframes - stone dropped in water effect from top-left */}
      <style>{`
        @keyframes ripple-wave {
          0%, 100% {
            transform: scale(1) skew(0deg, 0deg);
          }
          /* Initial ripple from top-left */
          8% {
            transform: scale(1.008) skew(0.3deg, 0.2deg);
          }
          16% {
            transform: scale(0.997) skew(-0.2deg, -0.1deg);
          }
          /* Wave reaches bottom-right, starts refraction */
          30% {
            transform: scale(1) skew(0deg, 0deg);
          }
          /* Refraction wave coming back */
          42% {
            transform: scale(1.005) skew(-0.2deg, -0.15deg);
          }
          50% {
            transform: scale(0.998) skew(0.15deg, 0.1deg);
          }
          /* Settle */
          65% {
            transform: scale(1) skew(0deg, 0deg);
          }
          /* Pause until next ripple */
        }
      `}</style>
    </>
  );
};

export default AnimatedTagline;