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

const PUNCTUATION = ["?", "??", "?!?"];

const getRandomPunctuation = () => PUNCTUATION[Math.floor(Math.random() * PUNCTUATION.length)];

interface FloatingTerm {
  id: number;
  text: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  fontSize: number;
  angle: number;
  punctuation: string;
}

const FloatingJargon = () => {
  const [terms, setTerms] = useState<FloatingTerm[]>([]);
  const animationRef = useRef<number>();
  const prefersReducedMotion = useRef(
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    // Generate terms starting from center, exploding outward
    const initialTerms: FloatingTerm[] = [];
    const termCount = 24;
    const centerX = 50;
    const centerY = 50;

    for (let i = 0; i < termCount; i++) {
      // Random angle for explosion direction
      const angle = (i / termCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const speed = 0.15 + Math.random() * 0.1; // Faster movement
      
      initialTerms.push({
        id: i,
        text: JARGON_TERMS[Math.floor(Math.random() * JARGON_TERMS.length)],
        x: centerX + (Math.random() - 0.5) * 10, // Start near center
        y: centerY + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed, // Velocity based on explosion angle
        vy: Math.sin(angle) * speed,
        opacity: 0.04 + Math.random() * 0.06, // Very low opacity (4-10%)
        fontSize: 10 + Math.random() * 6, // 10-16px
        angle: -5 + Math.random() * 10, // Slight tilt
        punctuation: getRandomPunctuation(),
      });
    }

    setTerms(initialTerms);

    if (prefersReducedMotion.current) return;

    // Animate the terms
    const animate = () => {
      setTerms((prev) =>
        prev.map((term) => {
          let newX = term.x + term.vx;
          let newY = term.y + term.vy;
          let newVx = term.vx;
          let newVy = term.vy;

          // Wrap around edges
          if (newX > 110) {
            newX = -10;
          } else if (newX < -10) {
            newX = 110;
          }
          if (newY > 110) {
            newY = -10;
          } else if (newY < -10) {
            newY = 110;
          }

          return {
            ...term,
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy,
          };
        })
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
            willChange: "left, top",
          }}
        >
          {term.text}{term.punctuation}
        </span>
      ))}
    </div>
  );
};

export default FloatingJargon;
