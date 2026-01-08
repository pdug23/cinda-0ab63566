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

// Exclusion zone where text content appears (in percentage coordinates)
const EXCLUSION_ZONE = {
  left: 20,
  right: 80,
  top: 15,
  bottom: 85,
  padding: 5, // Buffer around the zone
};

const isInExclusionZone = (x: number, y: number): boolean => {
  return (
    x > EXCLUSION_ZONE.left - EXCLUSION_ZONE.padding &&
    x < EXCLUSION_ZONE.right + EXCLUSION_ZONE.padding &&
    y > EXCLUSION_ZONE.top - EXCLUSION_ZONE.padding &&
    y < EXCLUSION_ZONE.bottom + EXCLUSION_ZONE.padding
  );
};

const FloatingJargon = () => {
  const [terms, setTerms] = useState<FloatingTerm[]>([]);
  const animationRef = useRef<number>();
  const prefersReducedMotion = useRef(
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    // Generate terms starting off-screen, floating inward
    const initialTerms: FloatingTerm[] = [];
    const termCount = 24;
    const centerX = 50;
    const centerY = 50;

    for (let i = 0; i < termCount; i++) {
      // Start from edges - distribute around the perimeter
      const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
      let startX: number, startY: number;
      
      switch (edge) {
        case 0: // top
          startX = Math.random() * 120 - 10;
          startY = -15 - Math.random() * 20;
          break;
        case 1: // right
          startX = 115 + Math.random() * 20;
          startY = Math.random() * 120 - 10;
          break;
        case 2: // bottom
          startX = Math.random() * 120 - 10;
          startY = 115 + Math.random() * 20;
          break;
        default: // left
          startX = -15 - Math.random() * 20;
          startY = Math.random() * 120 - 10;
          break;
      }
      
      // Calculate velocity toward center (with some randomness)
      const targetX = centerX + (Math.random() - 0.5) * 60;
      const targetY = centerY + (Math.random() - 0.5) * 60;
      const dx = targetX - startX;
      const dy = targetY - startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = 0.06 + Math.random() * 0.04; // Gentle inward drift
      
      initialTerms.push({
        id: i,
        text: JARGON_TERMS[Math.floor(Math.random() * JARGON_TERMS.length)],
        x: startX,
        y: startY,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
        opacity: 0.04 + Math.random() * 0.06,
        fontSize: 10 + Math.random() * 6,
        angle: -5 + Math.random() * 10,
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

          const wasInZone = isInExclusionZone(term.x, term.y);
          const willBeInZone = isInExclusionZone(newX, newY);

          // Bounce off exclusion zone
          if (willBeInZone && !wasInZone) {
            // Determine which edge we're hitting
            const fromLeft = term.x <= EXCLUSION_ZONE.left - EXCLUSION_ZONE.padding;
            const fromRight = term.x >= EXCLUSION_ZONE.right + EXCLUSION_ZONE.padding;
            const fromTop = term.y <= EXCLUSION_ZONE.top - EXCLUSION_ZONE.padding;
            const fromBottom = term.y >= EXCLUSION_ZONE.bottom + EXCLUSION_ZONE.padding;

            if (fromLeft || fromRight) {
              newVx = -newVx * (0.8 + Math.random() * 0.2);
              newVy += (Math.random() - 0.5) * 0.02; // Add slight random deflection
            }
            if (fromTop || fromBottom) {
              newVy = -newVy * (0.8 + Math.random() * 0.2);
              newVx += (Math.random() - 0.5) * 0.02;
            }

            // Keep position outside zone
            newX = term.x + newVx;
            newY = term.y + newVy;
          }

          // Wrap around screen edges
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
