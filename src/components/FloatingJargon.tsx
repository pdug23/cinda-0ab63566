import { useEffect, useState, useRef } from "react";

// Shoe jargon terms
const JARGON_TERMS = [
  "heel drop", "stack height", "max stack", "toe box", "midsole geometry",
  "rocker profile", "ground contact time", "energy return", "shock absorption",
  "propulsion", "stability guidance", "medial support", "lateral support",
  "heel counter", "forefoot flexibility", "torsional rigidity", "carbon plate",
  "nylon plate", "thermoplastic plate", "peba foam", "eva foam", "supercritical foam",
  "dual density midsole", "outsole rubber compound", "traction pattern", "ride feel",
  "transition smoothness", "cadence efficiency", "energy rods", "flyplate",
  "speedroll geometry", "rocker toe spring", "heel bevel", "platform width",
  "foot strike pattern", "pronation control", "stability rails", "cushioned ride",
  "responsive feel", "dampened ride", "long run comfort", "tempo efficiency",
  "daily trainer", "race day geometry", "midfoot lockdown"
];

interface FloatingTerm {
  id: number;
  text: string;
  x: number;
  y: number;
  speed: number;
  opacity: number;
  fontSize: number;
  angle: number;
}

const FloatingJargon = () => {
  const [terms, setTerms] = useState<FloatingTerm[]>([]);
  const animationRef = useRef<number>();
  const prefersReducedMotion = useRef(
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    // Generate initial terms spread across the screen
    const initialTerms: FloatingTerm[] = [];
    const termCount = 20;

    for (let i = 0; i < termCount; i++) {
      initialTerms.push({
        id: i,
        text: JARGON_TERMS[Math.floor(Math.random() * JARGON_TERMS.length)],
        x: Math.random() * 120 - 10, // -10% to 110% for seamless wrap
        y: Math.random() * 100,
        speed: 0.008 + Math.random() * 0.012, // Very slow movement
        opacity: 0.04 + Math.random() * 0.06, // Very low opacity (4-10%)
        fontSize: 10 + Math.random() * 6, // 10-16px
        angle: -5 + Math.random() * 10, // Slight tilt
      });
    }

    setTerms(initialTerms);

    if (prefersReducedMotion.current) return;

    // Animate the terms
    const animate = () => {
      setTerms((prev) =>
        prev.map((term) => ({
          ...term,
          x: term.x - term.speed, // Move left
          // Wrap around when off-screen
          ...(term.x < -15 && {
            x: 110,
            y: Math.random() * 100,
            text: JARGON_TERMS[Math.floor(Math.random() * JARGON_TERMS.length)],
          }),
        }))
      );
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[1]">
      {terms.map((term) => (
        <span
          key={term.id}
          className="absolute whitespace-nowrap text-card-foreground font-light select-none"
          style={{
            left: `${term.x}%`,
            top: `${term.y}%`,
            opacity: term.opacity,
            fontSize: `${term.fontSize}px`,
            transform: `rotate(${term.angle}deg)`,
            willChange: "left",
          }}
        >
          {term.text}
        </span>
      ))}
    </div>
  );
};

export default FloatingJargon;
