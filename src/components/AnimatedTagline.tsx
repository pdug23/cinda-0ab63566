import { useEffect, useState } from "react";

interface AnimatedTaglineProps {
  className?: string;
}

const AnimatedTagline = ({ className = "" }: AnimatedTaglineProps) => {
  const [shouldAnimate, setShouldAnimate] = useState(false);
  
  const prefersReducedMotion = typeof window !== "undefined" && 
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const words = "Every runner deserves to find their perfect fit.".split(" ");

  useEffect(() => {
    // Small delay to ensure component is mounted before animation starts
    const timer = setTimeout(() => setShouldAnimate(true), 50);
    return () => clearTimeout(timer);
  }, []);

  if (prefersReducedMotion) {
    return (
      <h1 
        className={className}
        style={{ fontVariantLigatures: "none", fontSize: "24px", fontWeight: 900 }}
      >
        Every runner deserves to find their perfect fit.
      </h1>
    );
  }

  return (
    <h1 
      className={className}
      style={{ fontVariantLigatures: "none", fontSize: "24px", fontWeight: 900 }}
    >
      {words.map((word, i) => (
        <span
          key={i}
          className={`inline-block transition-all duration-500 ease-out ${
            shouldAnimate 
              ? "opacity-100 translate-y-0" 
              : "opacity-0 translate-y-3"
          }`}
          style={{ 
            transitionDelay: `${i * 150}ms`,
            marginRight: i < words.length - 1 ? "0.3em" : 0
          }}
        >
          {word}
        </span>
      ))}
    </h1>
  );
};

export default AnimatedTagline;
