import { ReactNode, useEffect } from "react";

interface OnboardingLayoutProps {
  children: ReactNode;
  /** Whether the card content should scroll internally (e.g. for forms) */
  scrollable?: boolean;
  /** Whether to center the content vertically within the card */
  centerContent?: boolean;
}

const OnboardingLayout = ({ 
  children, 
  scrollable = false,
  centerContent = false 
}: OnboardingLayoutProps) => {
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
          className={`w-full max-w-lg flex flex-col bg-card rounded-2xl shadow-xl border border-border/20 overflow-hidden relative z-10 ${
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
