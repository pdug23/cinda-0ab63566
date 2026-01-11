import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export interface RaceTime {
  distance: "5k" | "10k" | "13.1mi" | "26.2mi";
  hours: number;
  minutes: number;
  seconds: number;
}

const DISTANCES: { value: RaceTime["distance"]; label: string }[] = [
  { value: "5k", label: "5k" },
  { value: "10k", label: "10k" },
  { value: "13.1mi", label: "13.1mi" },
  { value: "26.2mi", label: "26.2mi" },
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
      <span className="text-[10px] uppercase tracking-wider text-card-foreground/40 mb-3">{label}</span>
      <div className="relative">
        {/* Subtle center accent line - top */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-10"
          style={{ 
            top: `${ITEM_HEIGHT * 2 - 1}px`,
            width: "24px",
            height: "1px",
            background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.4), transparent)",
          }}
        />
        {/* Subtle center accent line - bottom */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-10"
          style={{ 
            top: `${ITEM_HEIGHT * 3}px`,
            width: "24px",
            height: "1px",
            background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.4), transparent)",
          }}
        />
        {/* Gradient overlays for fade effect */}
        <div 
          className="absolute inset-x-0 top-0 pointer-events-none z-20"
          style={{ 
            height: `${ITEM_HEIGHT * 2}px`,
            background: "linear-gradient(to bottom, hsl(var(--card)) 0%, hsl(var(--card) / 0.8) 50%, transparent 100%)",
          }}
        />
        <div 
          className="absolute inset-x-0 bottom-0 pointer-events-none z-20"
          style={{ 
            height: `${ITEM_HEIGHT * 2}px`,
            background: "linear-gradient(to top, hsl(var(--card)) 0%, hsl(var(--card) / 0.8) 50%, transparent 100%)",
          }}
        />
        <div
          ref={containerRef}
          className="overflow-y-scroll scrollbar-hide"
          style={{ 
            height: `${ITEM_HEIGHT * VISIBLE_ITEMS}px`,
            width: "56px",
            scrollBehavior: "smooth",
            WebkitOverflowScrolling: "touch",
          }}
          onScroll={handleScroll}
        >
          {/* Top padding */}
          <div style={{ height: `${ITEM_HEIGHT * 2}px` }} />
          {values.map((value) => {
            const isSelected = value === selected && !isScrolling;
            return (
              <div
                key={value}
                className="flex items-center justify-center transition-all duration-200"
                style={{ 
                  height: `${ITEM_HEIGHT}px`,
                  color: isSelected ? "hsl(var(--card-foreground))" : "hsl(var(--card-foreground) / 0.25)",
                  fontWeight: isSelected ? 500 : 400,
                  fontSize: isSelected ? "22px" : "18px",
                  textShadow: isSelected ? "0 0 20px hsl(var(--primary) / 0.5)" : "none",
                }}
              >
                {String(value).padStart(2, "0")}
              </div>
            );
          })}
          {/* Bottom padding */}
          <div style={{ height: `${ITEM_HEIGHT * 2}px` }} />
        </div>
      </div>
    </div>
  );
};

interface RaceTimePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  raceTime: RaceTime | null;
  onSave: (raceTime: RaceTime | null) => void;
}

export const RaceTimePickerModal = ({
  open,
  onOpenChange,
  raceTime,
  onSave,
}: RaceTimePickerModalProps) => {
  const [selectedDistance, setSelectedDistance] = useState<RaceTime["distance"]>("5k");
  const [currentTime, setCurrentTime] = useState({ hours: 0, minutes: 0, seconds: 0 });

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      if (raceTime) {
        setSelectedDistance(raceTime.distance);
        setCurrentTime({
          hours: raceTime.hours,
          minutes: raceTime.minutes,
          seconds: raceTime.seconds,
        });
      } else {
        setSelectedDistance("5k");
        setCurrentTime({ hours: 0, minutes: 0, seconds: 0 });
      }
    }
  }, [open, raceTime]);

  const handleClear = () => {
    setCurrentTime({ hours: 0, minutes: 0, seconds: 0 });
  };

  const handleSave = () => {
    const hasValue = currentTime.hours > 0 || currentTime.minutes > 0 || currentTime.seconds > 0;
    if (hasValue) {
      onSave({
        distance: selectedDistance,
        hours: currentTime.hours,
        minutes: currentTime.minutes,
        seconds: currentTime.seconds,
      });
    } else {
      onSave(null);
    }
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
            estimated race times
          </DialogTitle>
          <p className="text-xs text-card-foreground/50 mt-1">
            populate your most accurate race time
          </p>
        </DialogHeader>

        {/* Distance selection */}
        <div className="flex gap-1 px-4 pt-4 overflow-x-auto">
          {DISTANCES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSelectedDistance(value)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors whitespace-nowrap ${
                selectedDistance === value
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

// Utility function to format RaceTime for display
export const formatRaceTime = (time: RaceTime | null): string => {
  if (!time) return "";
  const { hours, minutes, seconds } = time;
  if (hours === 0 && minutes === 0 && seconds === 0) return "";
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};
