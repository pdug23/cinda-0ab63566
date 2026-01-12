import { ExternalLink } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface BuyNowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shoe: {
    fullName: string;
    brand: string;
  } | null;
}

const buildRunRepeatUrl = (brand: string, fullName: string): string => {
  // fullName already includes the brand, so just use it directly
  const slug = fullName
    .toLowerCase()
    .replace(/[%&'"/\\()]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
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
        className="max-w-xs border-card-foreground/30 p-6"
        style={{
          backgroundColor: "rgba(26, 26, 30, 0.98)",
        }}
      >
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={handleClick}
            className="relative w-full overflow-hidden rounded-lg border border-card-foreground/40 px-6 py-4 transition-all hover:border-card-foreground/70 group"
            style={{
              backgroundColor: "rgba(26, 26, 30, 0.95)",
            }}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            
            <div className="relative flex flex-col items-center gap-1">
              <div className="flex items-center gap-0.5 text-lg text-white">
                <span className="font-bold">Run</span>
                <span className="font-normal">Repeat</span>
                <ExternalLink className="h-4 w-4 ml-1.5 opacity-70" />
              </div>
              <span className="text-sm text-white/80 font-medium">Compare Prices & Buy</span>
            </div>
          </button>
          
          <p className="text-center text-white/50 text-xs">
            See pricing from 10+ retailers
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BuyNowModal;
