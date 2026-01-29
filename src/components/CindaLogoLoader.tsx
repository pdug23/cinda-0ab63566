import { useEffect, useState } from "react";
import cindaLogo from "@/assets/cinda-logo-grey.png";

export function CindaLogoLoader() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPrefersReducedMotion(
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    }
  }, []);

  return (
    <div className="flex items-center justify-center">
      <img 
        src={cindaLogo} 
        alt="Loading..." 
        className={`h-20 ${prefersReducedMotion ? "" : "animate-spin-stop-cycle"}`}
      />
    </div>
  );
}
