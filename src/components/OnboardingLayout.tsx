import { ReactNode } from "react";

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
  return (
    <div
      className="min-h-[100dvh]"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 16px)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)",
      }}
    >
      <main className="min-h-[calc(100dvh-32px)] flex items-center justify-center px-4 md:px-6">
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
