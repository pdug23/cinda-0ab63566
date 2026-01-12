import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BuyNowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shoe: {
    fullName: string;
    brand: string;
  } | null;
}

const buildRunRepeatUrl = (brand: string, fullName: string): string => {
  // Combine brand and full name
  const combined = `${brand} ${fullName}`;
  
  const slug = combined
    .toLowerCase()
    .replace(/[%&'"/\\()]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  
  return `https://runrepeat.com/${slug}`;
};

export function BuyNowModal({ open, onOpenChange, shoe }: BuyNowModalProps) {
  if (!shoe) return null;

  const runRepeatUrl = buildRunRepeatUrl(shoe.brand, shoe.fullName);

  const handleClick = () => {
    window.open(runRepeatUrl, '_blank', 'noopener,noreferrer');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm border-border/20"
        style={{
          backgroundColor: "rgba(26, 26, 30, 0.98)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-base font-medium lowercase text-white">
            buy: <span className="text-primary">{shoe.fullName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <Button
            onClick={handleClick}
            variant="cta"
            className="w-full h-auto py-4 flex flex-col items-center gap-2"
          >
            <div className="flex items-center gap-1 text-lg">
              <span className="font-bold">Run</span>
              <span className="font-normal">Repeat</span>
              <ExternalLink className="h-4 w-4 ml-1" />
            </div>
            <span className="text-sm font-medium">Compare Prices & Buy</span>
          </Button>
          <p className="text-center text-muted-foreground text-sm mt-3">
            See pricing from 10+ retailers
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BuyNowModal;
