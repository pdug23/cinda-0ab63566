import { useEffect, useState, ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

const PageTransition = ({ children, className = "" }: PageTransitionProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fade in on mount
    const timer = requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // Listen for exit event to fade out
    const handleExit = () => {
      setIsVisible(false);
    };

    window.addEventListener("page-exit", handleExit);

    return () => {
      cancelAnimationFrame(timer);
      window.removeEventListener("page-exit", handleExit);
    };
  }, []);

  return (
    <div
      className={`transition-opacity ease-out motion-reduce:transition-none ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transitionDuration: "180ms",
      }}
    >
      {children}
    </div>
  );
};

export default PageTransition;
