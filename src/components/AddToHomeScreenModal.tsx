import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Share, MoreVertical, Plus, Download } from "lucide-react";

const STORAGE_KEY = "cinda_a2hs_shown";

function detectPlatform(): "ios" | "android" {
  const ua = navigator.userAgent || navigator.vendor || "";
  if (/iPad|iPhone|iPod/.test(ua)) {
    return "ios";
  }
  if (/android/i.test(ua)) {
    return "android";
  }
  return "android"; // Default to Android for other mobile
}

function isMobileDevice(): boolean {
  const ua = navigator.userAgent || navigator.vendor || "";
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

function isStandalone(): boolean {
  // Check if already running as installed PWA
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function AddToHomeScreenModal() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android">("ios");

  useEffect(() => {
    // Don't show if:
    // 1. Not on mobile
    // 2. Already shown before
    // 3. Already installed as PWA
    if (!isMobileDevice() || isStandalone()) {
      return;
    }

    const hasShown = localStorage.getItem(STORAGE_KEY);
    if (hasShown) {
      return;
    }

    // Detect platform and show modal
    setPlatform(detectPlatform());
    setOpen(true);

    // Mark as shown immediately
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[340px] rounded-2xl border-border/30 bg-card p-0 shadow-xl">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="text-lg font-semibold text-card-foreground">
            Add Cinda to Home Screen
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Install Cinda for quick access — just like a real app.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={platform} className="w-full">
          <TabsList className="mx-5 grid w-[calc(100%-40px)] grid-cols-2 bg-secondary/50">
            <TabsTrigger
              value="ios"
              className="data-[state=active]:bg-card data-[state=active]:text-card-foreground"
            >
              <AppleIcon className="mr-1.5 h-4 w-4" />
              iPhone
            </TabsTrigger>
            <TabsTrigger
              value="android"
              className="data-[state=active]:bg-card data-[state=active]:text-card-foreground"
            >
              <AndroidIcon className="mr-1.5 h-4 w-4" />
              Android
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ios" className="px-5 pb-5 pt-4">
            <div className="space-y-4">
              <Step
                number={1}
                icon={<Share className="h-4 w-4 text-primary" />}
                text={
                  <>
                    Tap the <span className="font-medium text-card-foreground">Share</span> button in Safari
                  </>
                }
              />
              <Step
                number={2}
                icon={<Plus className="h-4 w-4 text-primary" />}
                text={
                  <>
                    Scroll and tap <span className="font-medium text-card-foreground">"Add to Home Screen"</span>
                  </>
                }
              />
              <Step
                number={3}
                icon={<CheckIcon className="h-4 w-4 text-primary" />}
                text={
                  <>
                    Tap <span className="font-medium text-card-foreground">"Add"</span> to confirm
                  </>
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="android" className="px-5 pb-5 pt-4">
            <div className="space-y-4">
              <Step
                number={1}
                icon={<MoreVertical className="h-4 w-4 text-primary" />}
                text={
                  <>
                    Tap the <span className="font-medium text-card-foreground">menu</span> (⋮) in Chrome
                  </>
                }
              />
              <Step
                number={2}
                icon={<Download className="h-4 w-4 text-primary" />}
                text={
                  <>
                    Tap <span className="font-medium text-card-foreground">"Install app"</span> or <span className="font-medium text-card-foreground">"Add to Home screen"</span>
                  </>
                }
              />
              <Step
                number={3}
                icon={<CheckIcon className="h-4 w-4 text-primary" />}
                text={
                  <>
                    Tap <span className="font-medium text-card-foreground">"Install"</span> to confirm
                  </>
                }
              />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Step({
  number,
  icon,
  text,
}: {
  number: number;
  icon: React.ReactNode;
  text: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-muted-foreground">
        {number}
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{text}</span>
      </div>
    </div>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function AndroidIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24c-1.44-.59-3.06-.93-4.82-.93-1.76 0-3.38.34-4.82.93L5.13 5.67c-.18-.28-.54-.37-.83-.22-.3.16-.42.54-.26.85l1.84 3.18C2.85 10.85 .5 13.72.5 17h23c0-3.28-2.35-6.15-5.4-7.52zM6.25 14c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm11.5 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
