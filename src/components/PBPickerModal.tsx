import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export interface PBTime {
  hours: number;
  minutes: number;
  seconds: number;
}

export interface PersonalBests {
  mile: PBTime | null;
  "5k": PBTime | null;
  "10k": PBTime | null;
  half: PBTime | null;
  marathon: PBTime | null;
}

export type PBKey = keyof PersonalBests;

const DISTANCES: { key: PBKey; label: string }[] = [
  { key: "mile", label: "1mi" },
  { key: "5k", label: "5k" },
  { key: "10k", label: "10k" },
  { key: "half", label: "13.1mi" },
  { key: "marathon", label: "26.2mi" },
];

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;

interface ScrollWheelProps {
  values: number[];
  selected: number;
  onChange: (value: number) => void;
  label: string;
}

const ScrollWheel = ({ values, selected, onChange, label }: ScrollWheelProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const scrollToValue = useCallback((value: number, smooth = true) => {
    const index = values.indexOf(value);
    if (index === -1 || !containerRef.current) return;
    const offset = index * ITEM_HEIGHT;
    containerRef.current.scrollTo({
      top: offset,
      behavior: smooth ? "smooth" : "auto",
    });
  }, [values]);

  useEffect(() => {
    scrollToValue(selected, false);
  }, [selected, scrollToValue]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    setIsScrolling(true);
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, values.length - 1));
      const newValue = values[clampedIndex];
      
      if (newValue !== selected) {
        onChange(newValue);
      }
      
      // Snap to position
      containerRef.current.scrollTo({
        top: clampedIndex * ITEM_HEIGHT,
        behavior: "smooth",
      });
      setIsScrolling(false);
    }, 100);
  };

  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-card-foreground/50 mb-2">{label}</span>
      <div className="relative">
        {/* Selection indicator */}
        <div 
          className="absolute left-0 right-0 pointer-events-none z-10 border-y border-orange-500/30 bg-orange-500/10"
          style={{ 
            top: `${ITEM_HEIGHT * 2}px`, 
            height: `${ITEM_HEIGHT}px` 
          }}
        />
        {/* Gradient overlays */}
        <div 
          className="absolute inset-x-0 top-0 pointer-events-none z-20 bg-gradient-to-b from-card to-transparent"
          style={{ height: `${ITEM_HEIGHT * 1.5}px` }}
        />
        <div 
          className="absolute inset-x-0 bottom-0 pointer-events-none z-20 bg-gradient-to-t from-card to-transparent"
          style={{ height: `${ITEM_HEIGHT * 1.5}px` }}
        />
        <div
          ref={containerRef}
          className="overflow-y-scroll scrollbar-hide"
          style={{ 
            height: `${ITEM_HEIGHT * VISIBLE_ITEMS}px`,
            width: "60px",
          }}
          onScroll={handleScroll}
        >
          {/* Top padding */}
          <div style={{ height: `${ITEM_HEIGHT * 2}px` }} />
          {values.map((value) => (
            <div
              key={value}
              className={`flex items-center justify-center transition-all ${
                value === selected && !isScrolling
                  ? "text-card-foreground font-medium"
                  : "text-card-foreground/40"
              }`}
              style={{ height: `${ITEM_HEIGHT}px` }}
            >
              {String(value).padStart(2, "0")}
            </div>
          ))}
          {/* Bottom padding */}
          <div style={{ height: `${ITEM_HEIGHT * 2}px` }} />
        </div>
      </div>
    </div>
  );
};

interface PBPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personalBests: PersonalBests;
  onSave: (pbs: PersonalBests) => void;
  initialDistance?: PBKey;
}

export const PBPickerModal = ({
  open,
  onOpenChange,
  personalBests,
  onSave,
  initialDistance = "mile",
}: PBPickerModalProps) => {
  const [localPBs, setLocalPBs] = useState<PersonalBests>(personalBests);
  const [activeDistance, setActiveDistance] = useState<PBKey>(initialDistance);
  const [currentTime, setCurrentTime] = useState<PBTime>({ hours: 0, minutes: 0, seconds: 0 });

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setLocalPBs(personalBests);
      setActiveDistance(initialDistance);
      const savedTime = personalBests[initialDistance];
      setCurrentTime(savedTime || { hours: 0, minutes: 0, seconds: 0 });
    }
  }, [open, personalBests, initialDistance]);

  // Save current time to local state when switching distances
  const handleDistanceChange = (newDistance: PBKey) => {
    // Save current time for current distance (if any values set)
    const hasValue = currentTime.hours > 0 || currentTime.minutes > 0 || currentTime.seconds > 0;
    setLocalPBs((prev) => ({
      ...prev,
      [activeDistance]: hasValue ? { ...currentTime } : null,
    }));

    // Load time for new distance
    setActiveDistance(newDistance);
    const savedTime = localPBs[newDistance];
    setCurrentTime(savedTime || { hours: 0, minutes: 0, seconds: 0 });
  };

  const handleClear = () => {
    setCurrentTime({ hours: 0, minutes: 0, seconds: 0 });
  };

  const handleSave = () => {
    // Save current selection before closing
    const hasValue = currentTime.hours > 0 || currentTime.minutes > 0 || currentTime.seconds > 0;
    const finalPBs = {
      ...localPBs,
      [activeDistance]: hasValue ? { ...currentTime } : null,
    };
    onSave(finalPBs);
    onOpenChange(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const hoursRange = Array.from({ length: 10 }, (_, i) => i);
  const minutesRange = Array.from({ length: 60 }, (_, i) => i);
  const secondsRange = Array.from({ length: 60 }, (_, i) => i);

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
            personal bests
          </DialogTitle>
        </DialogHeader>

        {/* Distance tabs */}
        <div className="flex gap-1 px-4 pt-4 overflow-x-auto">
          {DISTANCES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleDistanceChange(key)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors whitespace-nowrap ${
                activeDistance === key
                  ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                  : "bg-card-foreground/5 text-card-foreground/50 hover:text-card-foreground/70 border border-transparent"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Scroll wheels */}
        <div className="flex justify-center gap-4 py-6 px-4">
          <ScrollWheel
            values={hoursRange}
            selected={currentTime.hours}
            onChange={(hours) => setCurrentTime((prev) => ({ ...prev, hours }))}
            label="hours"
          />
          <div className="flex items-center pt-6 text-card-foreground/50 text-lg">:</div>
          <ScrollWheel
            values={minutesRange}
            selected={currentTime.minutes}
            onChange={(minutes) => setCurrentTime((prev) => ({ ...prev, minutes }))}
            label="mins"
          />
          <div className="flex items-center pt-6 text-card-foreground/50 text-lg">:</div>
          <ScrollWheel
            values={secondsRange}
            selected={currentTime.seconds}
            onChange={(seconds) => setCurrentTime((prev) => ({ ...prev, seconds }))}
            label="secs"
          />
        </div>

        {/* Clear action */}
        <div className="flex justify-center pb-4">
          <button
            onClick={handleClear}
            className="text-xs text-card-foreground/40 hover:text-card-foreground/60 transition-colors"
          >
            clear time
          </button>
        </div>

        {/* Save button */}
        <div className="p-4 pt-0">
          <Button onClick={handleSave} variant="cta" className="w-full min-h-[44px] text-sm">
            save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Utility function to format PBTime for display
export const formatPBTime = (time: PBTime | null): string => {
  if (!time) return "—";
  const { hours, minutes, seconds } = time;
  if (hours === 0 && minutes === 0 && seconds === 0) return "—";
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};
