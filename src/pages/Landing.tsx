import { useState } from "react";
import { Button } from "@/components/ui/button";
import cindaLogo from "@/assets/cinda-logo-grey.png";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import { usePageNavigation } from "@/hooks/usePageNavigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const Landing = () => {
  const { navigateWithTransition } = usePageNavigation();
  const [showModal, setShowModal] = useState(false);

  const handleStartProfile = () => {
    // Trigger container reveal animation first
    window.dispatchEvent(new CustomEvent("reveal-container"));
    // Then navigate after the container animation starts
    setTimeout(() => {
      navigateWithTransition("/profile");
    }, 150);
  };

  return (
    <>
      {/* Premium animated background */}
      <AnimatedBackground />

      <OnboardingLayout centerContent transparent>
        <PageTransition className="flex flex-col items-center justify-center text-center p-6 md:p-8 flex-1 relative z-10">
          {/* Logo */}
          <img src={cindaLogo} alt="Cinda" className="h-[104px]" />

          {/* Text block */}
          <div className="text-center mt-8">
            <p
              className="text-card-foreground/90 max-w-md leading-tight italic"
              style={{ fontVariantLigatures: "none", fontSize: "25px", fontWeight: 900 }}
            >
              Every runner deserves to find their perfect fit.
            </p>
          </div>

          {/* Find yours button */}
          <Button
            onClick={handleStartProfile}
            variant="cta"
            className="px-10 min-h-[44px] text-sm mt-8"
          >
            find yours
          </Button>
        </PageTransition>

        {/* How it works link - positioned lower with reduced prominence */}
        <button
          onClick={() => setShowModal(true)}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors cursor-pointer z-10"
        >
          how does cinda work?
        </button>

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
