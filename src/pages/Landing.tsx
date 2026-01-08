import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import cindaLogo from "@/assets/cinda-logo-grey.png";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import FloatingJargon from "@/components/FloatingJargon";
import { usePageNavigation } from "@/hooks/usePageNavigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type ViewState = "landing" | "orientation";

const Landing = () => {
  const { navigateWithTransition } = usePageNavigation();
  const [showModal, setShowModal] = useState(false);
  const [viewState, setViewState] = useState<ViewState>("landing");
  const [isExiting, setIsExiting] = useState(false);
  
  // Orientation content stagger states
  const [showHeadline, setShowHeadline] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [showCta, setShowCta] = useState(false);
  
  const prefersReducedMotion = typeof window !== "undefined" && 
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const handleStartOrientation = () => {
    setIsExiting(true);
    
    const exitDuration = prefersReducedMotion ? 0 : 300;
    
    setTimeout(() => {
      setViewState("orientation");
      setIsExiting(false);
    }, exitDuration);
  };

  const handleStartProfile = () => {
    window.dispatchEvent(new CustomEvent("reveal-container"));
    setTimeout(() => {
      navigateWithTransition("/profile");
    }, 150);
  };

  // Stagger orientation content appearance
  useEffect(() => {
    if (viewState !== "orientation") return;
    
    const delays = prefersReducedMotion 
      ? { headline: 0, steps: 0, cta: 0 }
      : { headline: 100, steps: 500, cta: 900 };

    const t1 = setTimeout(() => setShowHeadline(true), delays.headline);
    const t2 = setTimeout(() => setShowSteps(true), delays.steps);
    const t3 = setTimeout(() => setShowCta(true), delays.cta);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [viewState, prefersReducedMotion]);

  const steps = [
    "tell us about you and how you run",
    "share your current shoes (optional)",
    "get recommendations that actually fit your needs",
  ];

  return (
    <>
      <AnimatedBackground />
      
      {/* Floating jargon layer - only visible during orientation */}
      {viewState === "orientation" && <FloatingJargon />}

      <OnboardingLayout centerContent transparent>
        {viewState === "landing" && (
          <PageTransition className="flex flex-col items-center justify-center text-center p-6 md:p-8 flex-1 relative z-10">
            {/* Landing content with exit animation */}
            <div
              className={`flex flex-col items-center transition-all ${
                prefersReducedMotion ? "" : "duration-300"
              } ${isExiting ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
            >
              <img src={cindaLogo} alt="Cinda" className="h-[104px]" />

              <div className="text-center mt-8">
                <p
                  className="text-card-foreground/90 max-w-md leading-tight italic"
                  style={{ fontVariantLigatures: "none", fontSize: "25px", fontWeight: 900 }}
                >
                  every runner deserves to find their perfect fit.
                </p>
              </div>

              <Button
                onClick={handleStartOrientation}
                variant="cta"
                className="px-10 min-h-[44px] text-sm mt-8"
              >
                find yours
              </Button>
            </div>
          </PageTransition>
        )}

        {viewState === "orientation" && (
          <PageTransition className="flex flex-col items-center justify-center text-center p-6 md:p-8 flex-1 relative z-10">
            <div className="flex flex-col items-center max-w-md">
              {/* Headline and subheading */}
              <div
                className={`transition-all ${prefersReducedMotion ? "" : "duration-500"} ${
                  showHeadline ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              >
                <h1
                  className="text-card-foreground leading-tight italic"
                  style={{ fontVariantLigatures: "none", fontSize: "24px", fontWeight: 900 }}
                >
                  buying running shoes is more complex than it should be.
                </h1>
                <p className="text-card-foreground/80 text-base mt-4">
                  cinda helps you cut through the noise.
                </p>
              </div>

              {/* Steps */}
              <div
                className={`mt-10 w-full transition-all ${prefersReducedMotion ? "" : "duration-500"} ${
                  showSteps ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              >
                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 text-left"
                      style={{
                        transitionDelay: prefersReducedMotion ? "0ms" : `${index * 100}ms`,
                      }}
                    >
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-medium flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="text-card-foreground/80 text-sm pt-0.5">
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div
                className={`mt-10 w-full transition-all ${prefersReducedMotion ? "" : "duration-500"} ${
                  showCta ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              >
                <Button
                  onClick={handleStartProfile}
                  variant="cta"
                  className="w-full min-h-[44px] text-sm"
                >
                  let's get started
                </Button>
              </div>
            </div>
          </PageTransition>
        )}

        {/* How it works link - only on landing */}
        {viewState === "landing" && !isExiting && (
          <button
            onClick={() => setShowModal(true)}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs italic text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors cursor-pointer z-10"
          >
            how does cinda work?
          </button>
        )}

        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="bg-card border-border/40 w-[calc(100%-48px)] max-w-[320px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-150">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-primary">
                how does cinda work?
              </DialogTitle>
              <DialogDescription className="text-muted-foreground pt-3 space-y-3 text-sm">
                <span className="block">cinda helps runners find shoes that suit how they actually run.</span>
                <span className="block">instead of guessing based on brand or hype, cinda understands your preferences and looks at things like your body, pace and goals to find the right fit.</span>
              </DialogDescription>
            </DialogHeader>
            <div className="pt-4">
              <Button
                onClick={() => setShowModal(false)}
                variant="outline"
                className="w-full bg-transparent border-border/40 text-muted-foreground hover:bg-muted/20 hover:text-foreground text-sm"
              >
                got it
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </OnboardingLayout>
    </>
  );
};

export default Landing;
