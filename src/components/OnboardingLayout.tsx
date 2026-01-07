import { ReactNode } from "react";

interface OnboardingLayoutProps {
  children: ReactNode;
}

const OnboardingLayout = ({ children }: OnboardingLayoutProps) => {
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
          className="w-full max-w-lg flex flex-col bg-card rounded-2xl shadow-xl border border-border/20 overflow-hidden relative z-10 min-h-[82dvh] md:min-h-[640px]"
          style={{
            maxHeight:
              "calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 32px)",
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
};

export default OnboardingLayout;
