import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface UnsavedChangesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStay: () => void;
  onGoBack: () => void;
}

export const UnsavedChangesModal = ({
  open,
  onOpenChange,
  onStay,
  onGoBack,
}: UnsavedChangesModalProps) => {
  const handleClose = () => {
    onOpenChange(false);
    onStay();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-card border-border/20 p-0 gap-0">
        <DialogHeader className="p-4 pb-0 relative">
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 p-1 rounded-full text-card-foreground/50 hover:text-card-foreground hover:bg-card-foreground/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <DialogTitle className="text-sm font-normal text-card-foreground/90">
            leave this step?
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pt-4 pb-6">
          <p className="text-sm text-card-foreground/70">
            you've entered some info. if you go back now, it won't be saved.
          </p>
        </div>

        <div className="flex gap-3 p-4 pt-0">
          <Button
            onClick={onGoBack}
            variant="outline"
            className="flex-1 min-h-[44px] text-sm border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            go back
          </Button>
          <Button
            onClick={handleClose}
            variant="cta"
            className="flex-1 min-h-[44px] text-sm"
          >
            stay
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
