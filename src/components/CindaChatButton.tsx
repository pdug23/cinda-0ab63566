import { useState } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import cindaLogoGrey from "@/assets/cinda-logo-grey.png";
import { CindaChatSheet } from "./CindaChatSheet";
import { cn } from "@/lib/utils";

interface CindaChatButtonProps {
  className?: string;
}

export const CindaChatButton = ({ className }: CindaChatButtonProps) => {
  const { showCindaChatButton, cindaChatButtonAnimated, setCindaChatButtonAnimated } = useProfile();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Don't render if button shouldn't be shown
  if (!showCindaChatButton) return null;

  const handleClick = () => {
    // Mark animation as played after first interaction
    if (!cindaChatButtonAnimated) {
      setCindaChatButtonAnimated(true);
    }
    setSheetOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center",
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
          alt="Chat with Cinda"
          className="w-5 h-5 object-contain"
        />
      </button>

      <CindaChatSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
};
