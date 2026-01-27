import { useEffect, useState } from "react";

interface AnimatedTaglineProps {
  className?: string;
}

const AnimatedTagline = ({ className = "" }: AnimatedTaglineProps) => {
  const [shouldAnimate, setShouldAnimate] = useState(false);
  
  const prefersReducedMotion = typeof window !== "undefined" && 
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const lines = [
    "Every",
    "runner",
    "deserves",
    "to find",
    "their",
    "perfect",
    "fit."
  ];

  useEffect(() => {
    const timer = setTimeout(() => setShouldAnimate(true), 50);
    return () => clearTimeout(timer);
  }, []);

  if (prefersReducedMotion) {
    return (
      <h1 className={`flex flex-col items-center gap-1 ${className}`}>
        {lines.map((line, i) => (
          <span
            key={i}
            style={{ 
              fontSize: "36px", 
              fontWeight: 900, 
              fontStyle: "italic",
              fontVariantLigatures: "none"
            }}
          >
            {line}
          </span>
        ))}
      </h1>
    );
  }

  return (
    <h1 className={`flex flex-col items-center gap-1 ${className}`}>
      {lines.map((line, i) => (
        <span
          key={i}
          className={`block transition-all duration-500 ease-out ${
            shouldAnimate 
              ? "opacity-100 translate-y-0" 
              : "opacity-0 translate-y-4"
          }`}
          style={{ 
            transitionDelay: `${i * 120}ms`,
            fontSize: "36px",
            fontWeight: 900,
            fontStyle: "italic",
            fontVariantLigatures: "none"
          }}
        >
          {line}
        </span>
      ))}
    </h1>
  );
};

export default AnimatedTagline;
