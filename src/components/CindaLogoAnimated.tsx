import { useEffect, useState } from "react";
import cindaSegmentsSvg from "@/assets/cinda-segments.svg";

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

// Distance to move outward (in SVG units - increased for larger viewBox)
const EXPLODE_DISTANCE = 50;

// Animation timing
const SEGMENT_DURATION = 800; // ms per segment
const STAGGER_DELAY = 50; // ms between each segment start

export function CindaLogoAnimated({ isAnimating, className = "" }: CindaLogoAnimatedProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPrefersReducedMotion(
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    }
  }, []);

  // Fetch and parse the SVG
  useEffect(() => {
    fetch(cindaSegmentsSvg)
      .then(res => res.text())
      .then(text => {
        // Remove XML declaration if present
        const cleanedSvg = text.replace(/<\?xml[^?]*\?>/g, '');
        setSvgContent(cleanedSvg);
      })
      .catch(err => console.error("Failed to load SVG:", err));
  }, []);

  // Apply animation styles to segments
  useEffect(() => {
    if (!svgContent || !isAnimating || prefersReducedMotion) return;

    // Get all segment groups and apply animations
    const container = document.getElementById('cinda-logo-container');
    if (!container) return;

    ANIMATION_ORDER.forEach((clockPosition, index) => {
      // Map clock position to segment ID (1-12)
      const segmentId = clockPosition === 12 ? 12 : clockPosition;
      const segmentIdPadded = segmentId < 10 ? `0${segmentId}` : `${segmentId}`;
      
      // Try both naming conventions
      let segment = container.querySelector(`#Segment-${segmentId}`) as HTMLElement;
      if (!segment) {
        segment = container.querySelector(`#Segment-${segmentIdPadded}`) as HTMLElement;
      }
      
      if (segment) {
        const direction = SEGMENT_DIRECTIONS[clockPosition];
        const delay = index * STAGGER_DELAY;
        
        segment.style.setProperty('--tx', `${direction.x * EXPLODE_DISTANCE}px`);
        segment.style.setProperty('--ty', `${direction.y * EXPLODE_DISTANCE}px`);
        segment.style.animation = `segment-explode ${SEGMENT_DURATION}ms cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms forwards`;
      }
    });
  }, [svgContent, isAnimating, prefersReducedMotion]);

  if (!svgContent) {
    // Fallback while loading
    return (
      <div className={className} aria-label="Cinda" role="img" />
    );
  }

  return (
    <div 
      id="cinda-logo-container"
      className={className}
      aria-label="Cinda" 
      role="img"
      dangerouslySetInnerHTML={{
        __html: `
          <style>
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
          </style>
          ${svgContent}
        `
      }}
    />
  );
}

export default CindaLogoAnimated;
