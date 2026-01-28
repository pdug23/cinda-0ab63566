import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import cindaLogo from "@/assets/cinda-logo-grey.png";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import FloatingJargon from "@/components/FloatingJargon";
import AnimatedTagline from "@/components/AnimatedTagline";
import { usePageNavigation } from "@/hooks/usePageNavigation";
import { AddToHomeScreenModal } from "@/components/AddToHomeScreenModal";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/contexts/AuthContext";
import { analytics } from "@/lib/analytics";

type ViewState = "landing" | "orientation";

const Landing = () => {
  const { navigateWithTransition } = usePageNavigation();
  const { user } = useAuth();
  
  const [showA2HSModal, setShowA2HSModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
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

  const handleFullAnalysisClick = () => {
    if (user) {
      // Already signed in, proceed directly
      handleStartProfile();
    } else {
      // Not signed in, show auth modal
      setShowAuthModal(true);
    }
  };

  const handleAuthSuccess = () => {
    // After successful sign-in, proceed to profile
    handleStartProfile();
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
        {/* Logo - visible on both landing and orientation, spins on transition */}
        <img 
          src={cindaLogo} 
          alt="Cinda" 
          className={`h-[80px] absolute top-8 left-1/2 -translate-x-1/2 z-20 ${
            isExiting ? "animate-spin-settle" : ""
          }`}
        />

        {viewState === "landing" && (
          <PageTransition className="absolute inset-0 flex flex-col items-center text-center px-6 z-10">
            {/* Landing content - centered tagline */}
            <div
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all ${
                prefersReducedMotion ? "" : "duration-300"
              } ${isExiting ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
            >
              <AnimatedTagline className="text-card-foreground/90 max-w-md leading-tight text-center" />
            </div>

            {/* Button fixed above bottom link */}
            <div
              className={`absolute bottom-16 left-1/2 -translate-x-1/2 transition-all ${
                prefersReducedMotion ? "" : "duration-300"
              } ${isExiting ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
            >
              <Button
                onClick={handleStartOrientation}
                variant="cta"
                className="px-10 min-h-[44px] text-xs uppercase"
              >
                Find yours
              </Button>
            </div>
          </PageTransition>
        )}

        {viewState === "orientation" && (
          <PageTransition className="absolute inset-0 flex flex-col items-center text-center px-6 z-10">
            <div className="flex flex-col items-center max-w-md mt-[150px]">
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
                  className="text-card-foreground leading-tight italic mt-6"
                  style={{ fontVariantLigatures: "none", fontSize: "20px", fontWeight: 900 }}
                >
                  Endless marketing. Infinite options. Zero clarity.
                </p>
                <p className="text-card-foreground/80 text-base mt-6">
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
              className={`absolute bottom-16 left-1/2 -translate-x-1/2 w-full max-w-xs px-4 transition-all ${prefersReducedMotion ? "" : "duration-700"} ${
                showCta ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
                <div className="flex flex-row gap-3 w-full">
                <div className="flex-1 flex flex-col items-center gap-1.5">
                  <Button
                    onClick={handleFullAnalysisClick}
                    variant="cta"
                    className="w-full min-h-[56px] text-xs uppercase bg-primary/10 border-primary/30 text-card-foreground hover:bg-primary/20 hover:border-primary/50 hover:shadow-[0_2px_20px_hsl(var(--primary)/0.25)]"
                  >
                    Full analysis
                  </Button>
                  <span className="text-xs text-muted-foreground/60">~5 minutes</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-1.5">
                  <Button
                    onClick={() => navigateWithTransition("/quick-match")}
                    variant="cta"
                    className="w-full min-h-[56px] text-xs uppercase"
                  >
                    Quick match
                  </Button>
                  <span className="text-xs text-muted-foreground/60">~1 minute</span>
                </div>
              </div>
            </div>
          </PageTransition>
        )}

        {/* Web app promotion link - visible on both views */}
        {!isExiting && (
          <button
            onClick={() => {
              analytics.installLinkClicked(viewState);
              setShowA2HSModal(true);
            }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs italic text-muted-foreground/40 hover:text-muted-foreground/60 transition-all cursor-pointer z-10 underline underline-offset-2 decoration-dotted decoration-muted-foreground/20 hover:decoration-solid hover:decoration-muted-foreground/40"
          >
            Add Cinda as a web app for an optimal experience
          </button>
        )}

        <AddToHomeScreenModal 
          open={showA2HSModal} 
          onOpenChange={setShowA2HSModal} 
        />

        <AuthModal
          open={showAuthModal}
          onOpenChange={setShowAuthModal}
          onSuccess={handleAuthSuccess}
        />
      </OnboardingLayout>
    </>
  );
};

export default Landing;
