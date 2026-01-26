import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { X } from "lucide-react";
import cindaLogo from "@/assets/cinda-logo-grey.png";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import FloatingJargon from "@/components/FloatingJargon";
import { usePageNavigation } from "@/hooks/usePageNavigation";
import { AddToHomeScreenModal } from "@/components/AddToHomeScreenModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ViewState = "landing" | "orientation";

const Landing = () => {
  const { navigateWithTransition } = usePageNavigation();
  const [showModal, setShowModal] = useState(false);
  const [showA2HSModal, setShowA2HSModal] = useState(false);
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
    const pauseDuration = prefersReducedMotion ? 0 : 500; // 0.5s pause with just background + jargon
    
    setTimeout(() => {
      setViewState("orientation");
      setIsExiting(false);
    }, exitDuration + pauseDuration);
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
    "Tell us about you and how you run",
    "Share your current shoes (or don't)",
    "Get recommendations that actually fit your needs",
  ];

  return (
    <>
      <AnimatedBackground />
      
      {/* Floating jargon layer - visible during transition and orientation */}
      {(viewState === "orientation" || isExiting) && <FloatingJargon />}

      <OnboardingLayout centerContent transparent>
        {/* Persistent Logo - always visible, spins on transition */}
        <img 
          src={cindaLogo} 
          alt="Cinda" 
          className={`h-[80px] absolute top-[60px] left-1/2 -translate-x-1/2 z-20 ${
            isExiting ? "animate-spin-settle" : ""
          }`}
        />

        {viewState === "landing" && (
          <PageTransition className="absolute inset-0 flex flex-col items-center text-center px-6 z-10">
            {/* Landing content with exit animation */}
            <div
              className={`flex flex-col items-center transition-all ${
                prefersReducedMotion ? "" : "duration-300"
              } ${isExiting ? "opacity-0 scale-95" : "opacity-100 scale-100"} mt-[170px]`}
            >
              <h1
                className="text-card-foreground/90 max-w-md leading-tight italic text-center"
                style={{ fontVariantLigatures: "none", fontSize: "24px", fontWeight: 900 }}
              >
                Every runner deserves to find their perfect fit.
              </h1>
            </div>

            {/* Button fixed above bottom link */}
            <div
              className={`absolute bottom-20 left-1/2 -translate-x-1/2 transition-all ${
                prefersReducedMotion ? "" : "duration-300"
              } ${isExiting ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
            >
              <Button
                onClick={handleStartOrientation}
                variant="cta"
                className="px-10 min-h-[44px] text-sm"
              >
                Find yours
              </Button>
            </div>
          </PageTransition>
        )}

        {viewState === "orientation" && (
          <PageTransition className="absolute inset-0 flex flex-col items-center text-center px-6 z-10">
            <div className="flex flex-col items-center max-w-md mt-[170px]">
              {/* Headline and subheading */}
              <div
                className={`transition-all ${prefersReducedMotion ? "" : "duration-700"} ${
                  showHeadline ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              >
                <h1
                  className="text-card-foreground leading-tight italic"
                  style={{ fontVariantLigatures: "none", fontSize: "24px", fontWeight: 900 }}
                >
                  Buying running shoes has never felt more overwhelming.
                </h1>
                <p 
                  className="text-card-foreground leading-tight italic mt-4"
                  style={{ fontVariantLigatures: "none", fontSize: "20px", fontWeight: 900 }}
                >
                  Endless marketing. Infinite options. Zero clarity.
                </p>
                <p className="text-card-foreground/80 text-base mt-4">
                  Cinda helps you cut through the noise.
                </p>
              </div>

              {/* Steps */}
              <div
                className={`mt-10 w-full max-w-xs mx-auto transition-all ${prefersReducedMotion ? "" : "duration-700"} ${
                  showSteps ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              >
                <div className="space-y-4 pl-4">
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
                      <span className="text-sm pt-0.5 text-card-foreground">
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CTA buttons fixed above bottom link */}
            <div
              className={`absolute bottom-20 left-1/2 -translate-x-1/2 w-full max-w-xs px-6 transition-all ${prefersReducedMotion ? "" : "duration-700"} ${
                showCta ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Button
                  onClick={() => navigateWithTransition("/quick-match")}
                  variant="cta"
                  className="flex-1 min-h-[44px] text-sm"
                >
                  Quick match
                </Button>
                <Button
                  onClick={handleStartProfile}
                  variant="cta"
                  className="flex-1 min-h-[44px] text-sm bg-primary/10 border-primary/30 text-card-foreground hover:bg-primary/20 hover:border-primary/50 hover:shadow-[0_2px_20px_hsl(var(--primary)/0.25)]"
                >
                  Cinda analysis <Lock className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </PageTransition>
        )}

        {/* How it works link - only on landing */}
        {viewState === "landing" && !isExiting && (
          <button
            onClick={() => setShowModal(true)}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs italic text-muted-foreground/50 hover:text-muted-foreground/70 transition-all cursor-pointer z-10 underline underline-offset-2 decoration-dotted decoration-muted-foreground/30 hover:decoration-solid hover:decoration-muted-foreground/50"
          >
            How does Cinda work?
          </button>
        )}

        {/* Add to home screen link - only on orientation */}
        {viewState === "orientation" && !isExiting && (
          <button
            onClick={() => setShowA2HSModal(true)}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs italic text-muted-foreground/50 hover:text-muted-foreground/70 transition-all cursor-pointer z-10 underline underline-offset-2 decoration-dotted decoration-muted-foreground/30 hover:decoration-solid hover:decoration-muted-foreground/50"
          >
            Add Cinda to your home screen
          </button>
        )}

        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="bg-card border-border/40 w-[calc(100%-48px)] max-w-[320px] p-0 gap-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-150">
            <DialogHeader className="p-4 pb-0 relative">
              <button
                onClick={() => setShowModal(false)}
                className="absolute right-4 top-4 p-1 rounded-full text-card-foreground/50 hover:text-card-foreground hover:bg-card-foreground/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <DialogTitle className="text-lg font-semibold text-card-foreground">
                How does Cinda work?
              </DialogTitle>
            </DialogHeader>
            <div className="px-4 pt-4 pb-6">
              <p className="text-sm text-card-foreground/70 space-y-3">
                <span className="block">Cinda helps runners find shoes that suit how they actually run.</span>
                <span className="block">Instead of guessing based on brand or hype, Cinda understands your preferences and looks at things like your body, pace and goals to find the right fit.</span>
              </p>
            </div>
            <div className="p-4 pt-0">
              <Button
                onClick={() => setShowModal(false)}
                variant="outline"
                className="w-full min-h-[44px] bg-transparent border-border/40 text-muted-foreground hover:border-primary/60 hover:text-primary hover:bg-primary/5 text-sm"
              >
                Got it
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <AddToHomeScreenModal 
          open={showA2HSModal} 
          onOpenChange={setShowA2HSModal} 
        />
      </OnboardingLayout>
    </>
  );
};

export default Landing;
