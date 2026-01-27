import { useEffect, useState } from "react";

/**
 * Premium animated background for the landing page.
 * Features:
 * - Slow-moving gradient animation (20s cycle)
 * - Subtle animated grain overlay
 * - Soft vignette for readability
 * - Respects prefers-reduced-motion
 */
const LandingBackground = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    <>
      {/* Animated gradient layer */}
      <div
        className="fixed pointer-events-none z-0"
        style={{
          top: 0,
          left: 0,
          right: 0,
          bottom: "calc(-1 * env(safe-area-inset-bottom, 0px))",
          background: `
            radial-gradient(ellipse 90% 70% at 20% 25%, hsl(24 80% 45% / 0.5) 0%, hsl(28 75% 50% / 0.25) 35%, transparent 60%),
            radial-gradient(ellipse 65% 55% at 45% 55%, hsl(32 70% 55% / 0.2) 0%, transparent 50%),
            radial-gradient(ellipse 75% 60% at 80% 55%, hsl(205 50% 65% / 0.35) 0%, hsl(195 45% 70% / 0.15) 40%, transparent 60%),
            radial-gradient(ellipse 55% 45% at 90% 15%, hsl(190 40% 70% / 0.3) 0%, transparent 50%),
            radial-gradient(ellipse 50% 40% at 8% 80%, hsl(215 50% 65% / 0.2) 0%, transparent 55%),
            linear-gradient(135deg, hsl(0 0% 10%) 0%, hsl(0 0% 14%) 50%, hsl(0 0% 12%) 100%)
          `,
          backgroundSize: "200% 200%",
          animation: prefersReducedMotion ? "none" : "gradient-drift 20s ease-in-out infinite",
        }}
      />

      {/* Animated grain overlay */}
      <div
        className="fixed pointer-events-none z-[1]"
        style={{
          top: 0,
          left: 0,
          right: 0,
          bottom: "calc(-1 * env(safe-area-inset-bottom, 0px))",
          opacity: 0.04,
          mixBlendMode: "overlay",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          animation: prefersReducedMotion ? "none" : "grain-jitter 0.5s steps(10) infinite",
        }}
      />

      {/* Vignette overlay for edge darkening */}
      <div
        className="fixed pointer-events-none z-[2]"
        style={{
          top: 0,
          left: 0,
          right: 0,
          bottom: "calc(-1 * env(safe-area-inset-bottom, 0px))",
          background: `
            radial-gradient(ellipse 70% 60% at 50% 50%, transparent 0%, transparent 50%, hsl(0 0% 0% / 0.35) 100%)
          `,
        }}
      />

      {/* Keyframes injected via style tag */}
      <style>{`
        @keyframes gradient-drift {
          0%, 100% {
            background-position: 0% 50%;
          }
          25% {
            background-position: 50% 0%;
          }
          50% {
            background-position: 100% 50%;
          }
          75% {
            background-position: 50% 100%;
          }
        }

        @keyframes grain-jitter {
          0%, 100% {
            transform: translate(0, 0);
          }
          10% {
            transform: translate(-1%, -1%);
          }
          20% {
            transform: translate(1%, 0%);
          }
          30% {
            transform: translate(0%, 1%);
          }
          40% {
            transform: translate(-1%, 1%);
          }
          50% {
            transform: translate(1%, -1%);
          }
          60% {
            transform: translate(-1%, 0%);
          }
          70% {
            transform: translate(0%, -1%);
          }
          80% {
            transform: translate(1%, 1%);
          }
          90% {
            transform: translate(-1%, -1%);
          }
        }
      `}</style>
    </>
  );
};

export default LandingBackground;
