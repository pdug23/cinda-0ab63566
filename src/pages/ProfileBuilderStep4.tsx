import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import { CindaChatButton } from "@/components/CindaChatButton";
import { CindaChatSheet } from "@/components/CindaChatSheet";
import { useProfile, FeelPreferences, ShoeRequest } from "@/contexts/ProfileContext";
import { usePageNavigation } from "@/hooks/usePageNavigation";
import { saveShoeRequests, clearGap } from "@/utils/storage";
import { cn } from "@/lib/utils";

// Custom Sparkle Icon for "Recommend me a shoe"
const SparkleIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Main sparkle */}
    <path
      d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    {/* Small sparkle */}
    <path
      d="M19 16L19.75 18.25L22 19L19.75 19.75L19 22L18.25 19.75L16 19L18.25 18.25L19 16Z"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinejoin="round"
    />
  </svg>
);
// Custom Crosshair Icon - Minimalistic target/crosshair for "find a specific shoe"
const CrosshairIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Outer circle */}
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    {/* Crosshair lines */}
    <path
      d="M12 3V7M12 17V21M3 12H7M17 12H21"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    {/* Center dot */}
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);

// Custom Rotation Icon - Circular arrows for "check my rotation"
const RotationIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Top arrow arc */}
    <path
      d="M16.5 4.5C14.5 3.5 12 3.2 9.5 4C6 5.2 3.5 8.3 3.5 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    {/* Top arrowhead */}
    <path
      d="M16.5 4.5L14 3M16.5 4.5L15 7"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Bottom arrow arc */}
    <path
      d="M7.5 19.5C9.5 20.5 12 20.8 14.5 20C18 18.8 20.5 15.7 20.5 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    {/* Bottom arrowhead */}
    <path
      d="M7.5 19.5L10 21M7.5 19.5L9 17"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface ModeCardProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  disabled?: boolean;
  disabledReason?: string;
  onClick: () => void;
}

const ModeCard = ({
  icon,
  label,
  description,
  disabled = false,
  disabledReason,
  onClick,
}: ModeCardProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "group relative w-full p-5 rounded-xl text-left transition-all duration-300",
      "flex flex-row items-center gap-5",
      // Glass morphism effect
      "bg-card-foreground/[0.03] backdrop-blur-sm",
      // Border with slate blue
      "border border-slate-500/30",
      // Overflow hidden for shimmer effect
      "overflow-hidden",
      disabled
        ? "cursor-not-allowed opacity-50"
        : [
            // Hover effects - slate blue with scale
            "hover:scale-[1.02] hover:border-slate-400/50",
            "hover:shadow-[0_0_30px_rgba(148,163,184,0.2),0_0_60px_rgba(148,163,184,0.1)]",
            "hover:bg-card-foreground/[0.06]",
          ]
    )}
    style={{
      // Subtle gradient border overlay - slate blue
      background: disabled
        ? undefined
        : "linear-gradient(135deg, rgba(100,116,139,0.05) 0%, transparent 50%, rgba(100,116,139,0.03) 100%)",
    }}
  >
    {/* Shimmer effect on hover */}
    {!disabled && (
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background:
            "linear-gradient(105deg, transparent 40%, rgba(148,163,184,0.08) 50%, transparent 60%)",
          animation: "shimmer 1.5s ease-in-out",
        }}
      />
    )}

    {/* Glow backdrop for enabled cards - slate blue */}
    {!disabled && (
      <div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(148,163,184,0.1) 0%, transparent 70%)",
        }}
      />
    )}

    {/* Icon */}
    <div
      className={cn(
        "w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300 flex-shrink-0",
        disabled
          ? "bg-card-foreground/5 text-card-foreground/30"
          : "bg-slate-500/10 text-slate-400 group-hover:bg-slate-400/20 group-hover:text-slate-300 group-hover:scale-110"
      )}
    >
      {icon}
    </div>

    {/* Text content */}
    <div className="text-left relative z-10 flex-1">
      <span
        className={cn(
          "block text-sm font-semibold transition-colors mb-1",
          disabled
            ? "text-card-foreground/40"
            : "text-card-foreground/90 group-hover:text-card-foreground"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "block text-xs",
          disabled
            ? "text-card-foreground/25"
            : "text-card-foreground/50 group-hover:text-card-foreground/60"
        )}
      >
        {description}
      </span>
      {disabled && disabledReason && (
        <span className="block text-xs italic text-card-foreground/35 mt-2">
          {disabledReason}
        </span>
      )}
    </div>
  </button>
);

const ProfileBuilderStep4 = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { navigateWithTransition } = usePageNavigation();
  const { profileData, updateStep4, setShowCindaChatButton } = useProfile();

  const hasShoes = profileData.step3.currentShoes.length > 0;
  
  // Check if we should auto-open the chat sheet (coming from step 3)
  const shouldAutoOpenChat = location.state?.autoOpenChat === true;
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [hasShownIntroChat, setHasShownIntroChat] = useState(false);

  // Auto-open chat sheet on mount if coming from step 3
  useEffect(() => {
    if (shouldAutoOpenChat && !hasShownIntroChat) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        setIsSheetOpen(true);
        setHasShownIntroChat(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [shouldAutoOpenChat, hasShownIntroChat]);

  // When sheet closes after auto-open, show the Cinda button
  const handleSheetClose = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open && hasShownIntroChat) {
      // Show the persistent Cinda chat button after sheet closes
      setShowCindaChatButton(true);
    }
  };

  const handleBack = () => {
    navigate("/profile/step3");
  };

  const handleShoppingMode = () => {
    // Navigate to Shopping Mode flow (Step 4a)
    navigate("/profile/step4a");
  };

  const handleAnalysisMode = () => {
    if (!hasShoes) return;
    updateStep4({ mode: "analysis" });
    navigateWithTransition("/profile/step4-analysis");
  };

  const handleRecommendMode = () => {
    // Build "let Cinda decide" preferences for all options
    const cindaDecidesPreferences: FeelPreferences = {
      cushionAmount: { mode: "cinda_decides" },
      stabilityAmount: { mode: "cinda_decides" },
      energyReturn: { mode: "cinda_decides" },
      stackHeight: { mode: "cinda_decides" },
      rocker: { mode: "cinda_decides" },
      heelDropPreference: { mode: "cinda_decides" },
      brandPreference: { mode: "all", brands: [] },
    };

    // Build shoe request for daily trainer with Cinda deciding everything
    const shoeRequest: ShoeRequest = {
      archetype: "daily_trainer",
      feelPreferences: cindaDecidesPreferences,
    };

    // Save request and clear any existing gap data
    saveShoeRequests([shoeRequest]);
    clearGap();

    // Navigate to recommendations
    navigate("/recommendations", { state: { from: "/profile/step4" } });
  };

  return (
    <>
      <AnimatedBackground />
      <OnboardingLayout>
        <PageTransition className="flex flex-col flex-1 min-h-0">
          {/* Card header */}
          <header className="w-full px-6 md:px-8 pt-6 md:pt-8 pb-4 flex items-center justify-between flex-shrink-0">
            <button
              type="button"
              onClick={handleBack}
              className="h-7 px-3 flex items-center gap-2 rounded-full text-[10px] font-medium tracking-wider uppercase text-card-foreground/60 hover:text-card-foreground bg-card-foreground/[0.03] hover:bg-card-foreground/10 border border-card-foreground/20 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
            
            {/* Cinda chat button - center (only show if not in intro phase) */}
            {!shouldAutoOpenChat || hasShownIntroChat ? (
              <CindaChatButton />
            ) : (
              <div className="w-8 h-8" /> // Placeholder for layout balance
            )}
            
            {/* Empty spacer for layout balance */}
            <div className="w-[72px]" />
          </header>

          {/* Content */}
          <div className="flex flex-col px-6 md:px-8 pb-6 md:pb-8">
            {/* Heading - gray/white to match other steps */}
            <p className="text-sm text-card-foreground/90 mb-6 text-left">
              Profile complete. Now, how can Cinda help you?
            </p>

            {/* Mode cards - stacked vertically, full width */}
            <div className="flex flex-col gap-4">
              {/* Option 1: Recommend me a shoe - only shown when no shoes */}
              {!hasShoes && (
                <ModeCard
                  icon={<SparkleIcon className="w-6 h-6" />}
                  label="Recommend me a shoe"
                  description="Cinda picks one shoe based on your profile"
                  onClick={handleRecommendMode}
                />
              )}
              
              {/* Option 2: Check my rotation */}
              <ModeCard
                icon={<RotationIcon className="w-6 h-6" />}
                label="Check my rotation"
                description="Not sure what you're missing? Cinda reviews your current rotation and identifies what's missing"
                disabled={!hasShoes}
                disabledReason={
                  !hasShoes
                    ? "To analyse your rotation, you need to add at least one shoe first"
                    : undefined
                }
                onClick={handleAnalysisMode}
              />
              
              {/* Option 3: Find by shoe type */}
              <ModeCard
                icon={<CrosshairIcon className="w-6 h-6" />}
                label="Find by shoe type"
                description="Cinda works with you to find the exact shoe you need"
                onClick={handleShoppingMode}
              />
            </div>

            {/* Utility navigation buttons */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-card-foreground/10">
              <button
                type="button"
                onClick={() => navigate("/profile/step3")}
                className={cn(
                  "flex-1 py-2.5 px-4 rounded-lg text-xs font-medium",
                  "text-card-foreground/50 hover:text-card-foreground/70",
                  "bg-transparent hover:bg-card-foreground/5",
                  "border border-card-foreground/10 hover:border-card-foreground/20",
                  "transition-all duration-200",
                  "flex items-center justify-center gap-2"
                )}
              >
                <Pencil className="w-3 h-3" />
                Edit rotation
              </button>
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className={cn(
                  "flex-1 py-2.5 px-4 rounded-lg text-xs font-medium",
                  "text-card-foreground/50 hover:text-card-foreground/70",
                  "bg-transparent hover:bg-card-foreground/5",
                  "border border-card-foreground/10 hover:border-card-foreground/20",
                  "transition-all duration-200",
                  "flex items-center justify-center gap-2"
                )}
              >
                <Pencil className="w-3 h-3" />
                Edit profile
              </button>
            </div>
          </div>
        </PageTransition>
      </OnboardingLayout>

      {/* Cinda Chat Sheet - auto-opens when coming from step 3 */}
      <CindaChatSheet 
        open={isSheetOpen} 
        onOpenChange={handleSheetClose}
        showIntro={shouldAutoOpenChat}
      />

      {/* Shimmer animation keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </>
  );
};

export default ProfileBuilderStep4;
