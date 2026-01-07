import { Button } from "@/components/ui/button";
import cindaLogo from "@/assets/cinda-logo-grey.png";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import { usePageNavigation } from "@/hooks/usePageNavigation";

const Landing = () => {
  const { navigateWithTransition } = usePageNavigation();

  const handleStartProfile = () => {
    navigateWithTransition("/profile");
  };

  return (
    <OnboardingLayout centerContent>
      <PageTransition className="flex flex-col items-center justify-center text-center p-6 md:p-8 flex-1">
        <div className="space-y-4 mb-10">
          <img src={cindaLogo} alt="Cinda" className="h-[104px] mx-auto" />
          <p
            className="text-2xl text-card-foreground/90 max-w-md leading-tight font-extrabold italic"
            style={{ fontVariantLigatures: "none" }}
          >
            Every runner deserves to find their perfect fit.
          </p>
          <p className="text-muted-foreground max-w-md text-sm">
            Tell me a bit about you and I'll recommend shoes that suit how you run.
          </p>
        </div>

        {/* CTA Button */}
        <Button
          onClick={handleStartProfile}
          variant="cta"
          className="px-10 min-h-[44px] text-sm"
        >
          begin
        </Button>
      </PageTransition>
    </OnboardingLayout>
  );
};

export default Landing;
