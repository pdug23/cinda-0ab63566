import { useEffect, useState } from "react";

interface AnimatedTaglineProps {
  className?: string;
}

const AnimatedTagline = ({ className = "" }: AnimatedTaglineProps) => {
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [waveActive, setWaveActive] = useState(false);
  
  const prefersReducedMotion = typeof window !== "undefined" && 
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const lines = [
    "Every runner deserves",
    "to find their perfect fit."
  ];

  useEffect(() => {
    // Small delay to ensure component is mounted before animation starts
    const timer = setTimeout(() => setShouldAnimate(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Start wave animation after fade-in completes
  useEffect(() => {
    if (!shouldAnimate || prefersReducedMotion) return;
    
    // Wait for fade-in to complete (2 lines × 200ms stagger + 500ms duration + 200ms pause)
    const waveTimer = setTimeout(() => setWaveActive(true), 1200);
    return () => clearTimeout(waveTimer);
  }, [shouldAnimate, prefersReducedMotion]);

  if (prefersReducedMotion) {
    return (
      <h1 
        className={`flex flex-col items-center gap-2 ${className}`}
        style={{ fontVariantLigatures: "none" }}
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
    <h1 
      className={`flex flex-col items-center gap-2 ${className}`}
      style={{ fontVariantLigatures: "none" }}
    >
      {lines.map((line, i) => (
        <span
          key={i}
          className={`block transition-all duration-500 ease-out ${
            waveActive 
              ? "animate-float-wave opacity-100" 
              : shouldAnimate 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-4"
          }`}
          style={{ 
            transitionDelay: waveActive ? "0ms" : `${i * 200}ms`,
            animationDelay: waveActive ? `${i * 1.5}s` : "0ms",
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
};

export default AnimatedTagline;