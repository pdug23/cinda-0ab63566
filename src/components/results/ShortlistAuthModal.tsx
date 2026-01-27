import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ShortlistAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortlistAuthModal({ open, onOpenChange }: ShortlistAuthModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border/40">
        <DialogHeader>
          <DialogTitle className="text-card-foreground text-lg">
            Sign in to save your shortlist
          </DialogTitle>
          <DialogDescription className="text-card-foreground/70 text-sm pt-2">
            Create an account to save shoes and access your recommendations anytime
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            className="flex-1 border-border/40 text-muted-foreground hover:border-primary/60 hover:text-primary hover:bg-primary/5 transition-all"
            onClick={() => onOpenChange(false)}
          >
            Maybe later
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-border/40 text-muted-foreground hover:border-primary/60 hover:text-primary hover:bg-primary/5 transition-all"
            onClick={() => onOpenChange(false)}
          >
            Sign in
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ShortlistAuthModal;
