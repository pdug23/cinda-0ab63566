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

const encodeShoeName = (name: string): string => {
  return encodeURIComponent(name);
};

const getBrandSearchUrl = (brand: string, shoeName: string): string | null => {
  const encoded = encodeShoeName(shoeName);
  
  const brandUrls: Record<string, string> = {
    "Nike": `https://www.nike.com/gb/w?q=${encoded}`,
    "ASICS": `https://www.asics.com/gb/en-gb/search?q=${encoded}`,
    "HOKA": `https://www.hoka.com/en/gb/search?q=${encoded}`,
    "New Balance": `https://www.newbalance.co.uk/search?q=${encoded}`,
    "Brooks": `https://www.brooksrunning.com/en_gb/search?q=${encoded}`,
    "Saucony": `https://www.saucony.com/UK/en_GB/search?q=${encoded}`,
    "On": `https://www.on-running.com/en-gb/search?q=${encoded}`,
    "Salomon": `https://www.salomon.com/en-gb/search?q=${encoded}`,
    "Altra": `https://www.altrarunning.eu/search?q=${encoded}`,
    "Mizuno": `https://www.mizuno.eu/search?query=${encoded}`,
    "Adidas": `https://www.adidas.co.uk/search?q=${encoded}`,
    "PUMA": `https://eu.puma.com/uk/en/search?q=${encoded}`,
    "Topo Athletic": `https://www.topoathletic.com/catalogsearch/result/?q=${encoded}`,
  };
  
  return brandUrls[brand] || null;
};

const retailers = [
  {
    name: "SportsShoes",
    getUrl: (shoeName: string) => `https://www.sportsshoes.com/search/${encodeShoeName(shoeName)}`,
  },
  {
    name: "Start Fitness",
    getUrl: (shoeName: string) => `https://www.startfitness.co.uk/search?type=product&q=${encodeShoeName(shoeName)}`,
  },
  {
    name: "Pro Direct",
    getUrl: (shoeName: string) => `https://www.prodirectrunning.com/search/?query=${encodeShoeName(shoeName)}`,
  },
  {
    name: "Sports Direct",
    getUrl: (shoeName: string) => `https://www.sportsdirect.com/search?term=${encodeShoeName(shoeName)}`,
  },
];

export function BuyNowModal({ open, onOpenChange, shoe }: BuyNowModalProps) {
  if (!shoe) return null;

  const brandUrl = getBrandSearchUrl(shoe.brand, shoe.fullName);

  const handleLinkClick = () => {
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
          <DialogTitle className="text-base font-medium lowercase">
            buy: <span className="text-primary">{shoe.fullName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Brand Button */}
          {brandUrl && (
            <Button
              variant="cta"
              className="w-full gap-2 lowercase"
              asChild
              onClick={handleLinkClick}
            >
              <a
                href={brandUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                buy from {shoe.brand}
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          )}

          {/* Retailer Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {retailers.map((retailer) => (
              <Button
                key={retailer.name}
                variant="outline"
                className="gap-2 lowercase text-sm"
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.3)",
                  borderColor: "rgba(255, 255, 255, 0.2)",
                  color: "rgba(255, 255, 255, 0.7)",
                }}
                asChild
                onClick={handleLinkClick}
              >
                <a
                  href={retailer.getUrl(shoe.fullName)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {retailer.name}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BuyNowModal;
