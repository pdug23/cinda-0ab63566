import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Share, MoreVertical, Plus, Download, Bookmark, Monitor } from "lucide-react";

type Platform = "ios" | "android" | "macos" | "windows" | "desktop";

function detectPlatform(): Platform {
  const ua = navigator.userAgent || navigator.vendor || "";
  
  // Mobile first
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  
  // Desktop detection
  if (/Macintosh|Mac OS X/i.test(ua)) return "macos";
  if (/Windows/i.test(ua)) return "windows";
  
  return "desktop"; // Fallback for Linux, etc.
}

function getDefaultTab(platform: Platform): "ios" | "android" | "desktop" {
  if (platform === "ios") return "ios";
  if (platform === "android") return "android";
  return "desktop";
}

interface AddToHomeScreenModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

export function AddToHomeScreenModal({ 
  open = false, 
  onOpenChange, 
  onClose 
}: AddToHomeScreenModalProps) {
  const platform = detectPlatform();
  const defaultTab = getDefaultTab(platform);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange?.(isOpen);
    if (!isOpen) {
      onClose?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-[340px] rounded-2xl border-border/30 bg-card p-0 shadow-xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="text-lg font-semibold text-card-foreground">
            Cinda is best as a web app
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Install Cinda to your home screen for the full experience — fast, offline-ready, and always one tap away.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="mx-5 grid w-[calc(100%-40px)] grid-cols-3 bg-secondary/50">
            <TabsTrigger
              value="ios"
              className="data-[state=active]:bg-card data-[state=active]:text-card-foreground text-xs"
            >
              <AppleIcon className="mr-1 h-3.5 w-3.5" />
              iPhone
            </TabsTrigger>
            <TabsTrigger
              value="android"
              className="data-[state=active]:bg-card data-[state=active]:text-card-foreground text-xs"
            >
              <AndroidIcon className="mr-1 h-3.5 w-3.5" />
              Android
            </TabsTrigger>
            <TabsTrigger
              value="desktop"
              className="data-[state=active]:bg-card data-[state=active]:text-card-foreground text-xs"
            >
              <Monitor className="mr-1 h-3.5 w-3.5" />
              Desktop
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ios" className="px-5 pb-5 pt-4">
            <div className="space-y-4">
              <Step
                number={1}
                icon={<Share className="h-4 w-4 text-primary" />}
                text={
                  <>
                    tap the <span className="font-medium text-card-foreground">share</span> button in your browser
                  </>
                }
              />
              <Step
                number={2}
                icon={<Plus className="h-4 w-4 text-primary" />}
                text={
                  <>
                    scroll and tap <span className="font-medium text-card-foreground">"add to home screen"</span>
                  </>
                }
              />
              <Step
                number={3}
                icon={<CheckIcon className="h-4 w-4 text-primary" />}
                text={
                  <>
                    tap <span className="font-medium text-card-foreground">"add"</span> to confirm
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
                    tap the <span className="font-medium text-card-foreground">menu</span> icon in your browser
                  </>
                }
              />
              <Step
                number={2}
                icon={<Download className="h-4 w-4 text-primary" />}
                text={
                  <>
                    look for <span className="font-medium text-card-foreground">"install app"</span> or <span className="font-medium text-card-foreground">"add to home screen"</span>
                  </>
                }
              />
              <Step
                number={3}
                icon={<CheckIcon className="h-4 w-4 text-primary" />}
                text={
                  <>
                    tap <span className="font-medium text-card-foreground">"install"</span> or <span className="font-medium text-card-foreground">"add"</span> to confirm
                  </>
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="desktop" className="px-5 pb-5 pt-4">
            <div className="space-y-4">
              <Step
                number={1}
                icon={<Download className="h-4 w-4 text-primary" />}
                text={
                  <>
                    look for an <span className="font-medium text-card-foreground">install</span> icon in your browser's address bar
                  </>
                }
              />
              <Step
                number={2}
                icon={<Plus className="h-4 w-4 text-primary" />}
                text={
                  <>
                    or use the browser menu and select <span className="font-medium text-card-foreground">"install cinda"</span>
                  </>
                }
              />
              <Step
                number={3}
                icon={<Bookmark className="h-4 w-4 text-primary" />}
                text={
                  <>
                    alternatively, <span className="font-medium text-card-foreground">bookmark</span> this page for easy access
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
