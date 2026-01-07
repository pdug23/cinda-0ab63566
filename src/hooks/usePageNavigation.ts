import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

const TRANSITION_DURATION = 180;

export const usePageNavigation = () => {
  const navigate = useNavigate();

  const navigateWithTransition = useCallback(
    (to: string) => {
      // Check for reduced motion preference
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (prefersReducedMotion) {
        navigate(to);
        return;
      }

      // Dispatch custom event to trigger fade-out
      window.dispatchEvent(new CustomEvent("page-exit"));

      // Wait for fade-out, then navigate
      setTimeout(() => {
        navigate(to);
      }, TRANSITION_DURATION);
    },
    [navigate]
  );

  return { navigateWithTransition };
};
