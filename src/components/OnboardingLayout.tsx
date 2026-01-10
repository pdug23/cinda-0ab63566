import { ReactNode, useEffect, useState } from "react";

interface OnboardingLayoutProps {
  children: ReactNode;
  /** Whether the card content should scroll internally (e.g. for forms) */
  scrollable?: boolean;
  /** Whether to center the content vertically within the card */
  centerContent?: boolean;
  /** Whether the container should be transparent (for landing page) */
  transparent?: boolean;
  /** Whether to make just the background transparent (allows glow effects to show through) */
  transparentBackground?: boolean;
}

const OnboardingLayout = ({ 
  children, 
  scrollable = false,
  centerContent = false,
  transparent = false,
  transparentBackground = false
}: OnboardingLayoutProps) => {
  const [showContainer, setShowContainer] = useState(!transparent);

  // Lock body scroll when this layout is mounted
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    
    // Store original styles
    const originalHtmlOverflow = html.style.overflow;
    const originalBodyOverflow = body.style.overflow;
    const originalHtmlHeight = html.style.height;
    const originalBodyHeight = body.style.height;
    
    // Lock scroll
    html.style.overflow = "hidden";
    html.style.height = "100%";
    body.style.overflow = "hidden";
    body.style.height = "100%";
    
    return () => {
      // Restore original styles on unmount
      html.style.overflow = originalHtmlOverflow;
      html.style.height = originalHtmlHeight;
      body.style.overflow = originalBodyOverflow;
      body.style.height = originalBodyHeight;
    };
  }, []);

  // Listen for container reveal event (triggered before navigation)
  useEffect(() => {
    if (!transparent) return;

    const handleReveal = () => {
      setShowContainer(true);
    };

    window.addEventListener("reveal-container", handleReveal);
    return () => window.removeEventListener("reveal-container", handleReveal);
  }, [transparent]);

  const containerClasses = transparent && !showContainer
    ? "bg-transparent border-transparent shadow-none"
    : transparentBackground
      ? "bg-transparent border-border/20 shadow-xl"
      : "bg-card border-border/20 shadow-xl";

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 16px)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)",
      }}
    >
      <main className="h-full flex items-center justify-center px-4 md:px-6">
        <div
          className={`w-full max-w-lg flex flex-col rounded-2xl border overflow-hidden relative z-10 transition-all duration-300 ease-out ${containerClasses} ${
            centerContent ? 'justify-center' : ''
          }`}
          style={{
            height: "calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 32px)",
            maxHeight: "720px",
            minHeight: "540px",
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
};

export default OnboardingLayout;
