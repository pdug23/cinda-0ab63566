import { useEffect, useState, ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

const PageTransition = ({ children, className = "" }: PageTransitionProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Small delay to ensure DOM is ready, then fade in
    const timer = requestAnimationFrame(() => {
      setIsVisible(true);
    });
    return () => cancelAnimationFrame(timer);
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
