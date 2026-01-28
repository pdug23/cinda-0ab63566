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
  /** Whether to allow content to overflow (for glow effects) */
  allowOverflow?: boolean;
  /** Whether to remove all visual styling (bg, border, shadow, max-width) */
  invisible?: boolean;
}

const OnboardingLayout = ({
  children,
  scrollable = false,
  centerContent = false,
  transparent = false,
  transparentBackground = false,
  allowOverflow = false,
  invisible = false
}: OnboardingLayoutProps) => {
  const [showContainer, setShowContainer] = useState(!transparent);

  // Lock body scroll when this layout is mounted
  // Note: Removed height: 100% forcing on html/body - causes iOS grey bar painting bugs
  useEffect(() => {
    const body = document.body;

    // Store original overflow
    const originalBodyOverflow = body.style.overflow;

    // Lock scroll (minimal approach to avoid iOS painting issues)
    body.style.overflow = "hidden";

    return () => {
      // Restore original overflow on unmount
      body.style.overflow = originalBodyOverflow;
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

  const containerClasses = invisible
    ? "bg-transparent border-transparent shadow-none rounded-none"
    : transparent && !showContainer
      ? "bg-transparent border-transparent shadow-none"
      : transparentBackground
        ? "bg-transparent border-border/20 shadow-xl"
        : "bg-card border-border/20 shadow-xl";

  return (
    <div
      className={`fixed inset-0 ${allowOverflow ? 'overflow-x-hidden overflow-y-visible' : 'overflow-hidden'}`}
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 16px)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)",
      }}
    >
      <main className="h-full flex flex-col items-center justify-center px-4 md:px-6">
        <div
          className={`w-full ${invisible ? '' : 'max-w-lg'} flex flex-col ${invisible ? '' : 'rounded-2xl'} border ${allowOverflow ? 'overflow-x-hidden overflow-y-visible' : 'overflow-hidden'} relative z-10 transition-all duration-300 ease-out ${containerClasses} ${centerContent ? 'justify-center' : ''
            }`}
          style={{
            height: "calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 16px)",
            maxHeight: invisible ? "none" : "768px",
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
