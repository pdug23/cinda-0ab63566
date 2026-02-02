import { useState } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import cindaLogoGrey from "@/assets/cinda-logo-grey.png";
import { CindaChatSheet } from "./CindaChatSheet";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface CindaChatButtonProps {
  className?: string;
}

export const CindaChatButton = ({ className }: CindaChatButtonProps) => {
  const { 
    showCindaChatButton, 
    cindaChatButtonAnimated, 
    setCindaChatButtonAnimated,
    cindaTooltipDismissed,
    setCindaTooltipDismissed
  } = useProfile();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Don't render if button shouldn't be shown
  if (!showCindaChatButton) return null;

  const handleClick = () => {
    // Dismiss tooltip when button is clicked
    if (!cindaTooltipDismissed) {
      setCindaTooltipDismissed(true);
    }
    // Mark animation as played after first interaction
    if (!cindaChatButtonAnimated) {
      setCindaChatButtonAnimated(true);
    }
    setSheetOpen(true);
  };

  const handleDismissTooltip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCindaTooltipDismissed(true);
  };

  // Show tooltip only when: button is visible, tooltip not dismissed, and it's the first reveal
  const showTooltip = !cindaTooltipDismissed && !cindaChatButtonAnimated;

  return (
    <>
      <div className="relative flex items-center">
        {/* Tooltip bubble */}
        {showTooltip && (
          <div 
            className={cn(
              "absolute top-full right-0 mt-2 z-[9999]",
              "bg-card border border-border/60 rounded-lg shadow-xl",
              "p-3 pr-7 w-48",
              "opacity-0 animate-tooltip-fade-in"
            )}
          >
            <p className="text-xs text-muted-foreground leading-relaxed">
              More to say? Tap here anytime to add or update your info.
            </p>
            <button
              type="button"
              onClick={handleDismissTooltip}
              className="absolute top-2 right-2 p-0.5 rounded-full hover:bg-muted/50 transition-colors"
              aria-label="Dismiss tooltip"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
            {/* Arrow pointing up to button */}
            <div 
              className="absolute top-0 right-4 -translate-y-full w-0 h-0 border-x-[6px] border-x-transparent border-b-[6px] border-b-border/60"
            />
            <div 
              className="absolute top-0 right-4 -translate-y-[5px] w-0 h-0 border-x-[6px] border-x-transparent border-b-[6px] border-b-card"
            />
          </div>
        )}

        {/* Cinda button - pill shape matching Back button */}
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            "h-7 px-3 flex items-center gap-2 rounded-full",
            "text-[10px] font-medium tracking-wider uppercase",
            "text-card-foreground/60 hover:text-card-foreground",
            "bg-card-foreground/[0.03] hover:bg-card-foreground/10",
            "border border-card-foreground/20",
            "transition-colors",
            // Apply reveal animation only on first appearance
            !cindaChatButtonAnimated && "animate-cinda-reveal",
            className
          )}
          aria-label="Chat with Cinda"
        >
          <img
            src={cindaLogoGrey}
            alt=""
            className="w-4 h-4 object-contain"
          />
          <span>Cinda</span>
        </button>
      </div>

      <CindaChatSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
};
