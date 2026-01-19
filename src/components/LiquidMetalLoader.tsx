import { useEffect, useState } from "react";

export function LiquidMetalLoader() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPrefersReducedMotion(
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    }
  }, []);

  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      {/* SVG Filter for the liquid/gooey effect */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <filter id="liquid-filter">
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -10"
              result="contrast"
            />
            <feComposite in="SourceGraphic" in2="contrast" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Liquid blob container */}
      <div
        className="relative w-full h-full"
        style={{
          filter: "url(#liquid-filter)",
        }}
      >
        {/* Primary blob - larger, slow orbit */}
        <div
          className="absolute rounded-full"
          style={{
            width: "70px",
            height: "70px",
            left: "50%",
            top: "50%",
            marginLeft: "-35px",
            marginTop: "-35px",
            background: "linear-gradient(135deg, hsl(var(--muted-foreground) / 0.7), hsl(var(--muted-foreground) / 0.4))",
            animation: prefersReducedMotion ? "none" : "blob-orbit-1 8s ease-in-out infinite",
          }}
        />

        {/* Secondary blob - medium, counter-rotation */}
        <div
          className="absolute rounded-full"
          style={{
            width: "55px",
            height: "55px",
            left: "50%",
            top: "50%",
            marginLeft: "-27.5px",
            marginTop: "-27.5px",
            background: "linear-gradient(225deg, hsl(var(--muted-foreground) / 0.6), hsl(var(--muted-foreground) / 0.3))",
            animation: prefersReducedMotion ? "none" : "blob-orbit-2 10s ease-in-out infinite",
          }}
        />

        {/* Tertiary blob - smaller, faster */}
        <div
          className="absolute rounded-full"
          style={{
            width: "40px",
            height: "40px",
            left: "50%",
            top: "50%",
            marginLeft: "-20px",
            marginTop: "-20px",
            background: "linear-gradient(180deg, hsl(var(--muted-foreground) / 0.5), hsl(var(--primary) / 0.15))",
            animation: prefersReducedMotion ? "none" : "blob-orbit-3 6s ease-in-out infinite",
          }}
        />
      </div>

      {/* Inline keyframes for blob animations */}
      <style>{`
        @keyframes blob-orbit-1 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(25px, -15px) scale(1.05);
          }
          50% {
            transform: translate(0, 20px) scale(0.95);
          }
          75% {
            transform: translate(-25px, -10px) scale(1.02);
          }
        }

        @keyframes blob-orbit-2 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(-20px, 20px) scale(0.98);
          }
          50% {
            transform: translate(15px, -15px) scale(1.05);
          }
          75% {
            transform: translate(20px, 10px) scale(0.95);
          }
        }

        @keyframes blob-orbit-3 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(-15px, -20px) scale(1.1);
          }
          66% {
            transform: translate(18px, 12px) scale(0.9);
          }
        }
      `}</style>
    </div>
  );
}
