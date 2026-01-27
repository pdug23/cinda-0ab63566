import { AlertTriangle, WifiOff, Search, Clock, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ErrorType = "api" | "not-found" | "session" | "general";

interface ErrorStateProps {
  type?: ErrorType;
  /** Custom heading (overrides default for type) */
  heading?: string;
  /** Custom explanation (overrides default for type) */
  explanation?: string;
  /** Primary action handler */
  onPrimaryAction?: () => void;
  /** Primary action label (overrides default for type) */
  primaryLabel?: string;
  /** Secondary action handler (optional) */
  onSecondaryAction?: () => void;
  /** Secondary action label */
  secondaryLabel?: string;
  /** Additional className for container */
  className?: string;
}

const ERROR_CONFIG: Record<ErrorType, {
  icon: typeof AlertTriangle;
  heading: string;
  explanation: string;
  primaryLabel: string;
}> = {
  api: {
    icon: WifiOff,
    heading: "Couldn't load recommendations",
    explanation: "Check your connection and try again",
    primaryLabel: "Try again",
  },
  "not-found": {
    icon: Search,
    heading: "No matches found",
    explanation: "Try adjusting your preferences",
    primaryLabel: "Go back",
  },
  session: {
    icon: Clock,
    heading: "Session expired",
    explanation: "Let's start fresh",
    primaryLabel: "Start over",
  },
  general: {
    icon: AlertTriangle,
    heading: "Something went wrong",
    explanation: "We're looking into it",
    primaryLabel: "Try again",
  },
};

const ErrorState = ({
  type = "general",
  heading,
  explanation,
  onPrimaryAction,
  primaryLabel,
  onSecondaryAction,
  secondaryLabel,
  className,
}: ErrorStateProps) => {
  const config = ERROR_CONFIG[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-12 animate-fade-in",
        className
      )}
    >
      {/* Error icon */}
      <div className="w-16 h-16 rounded-full bg-card-foreground/5 border border-card-foreground/10 flex items-center justify-center mb-6">
        <Icon className="w-8 h-8 text-card-foreground/40" />
      </div>

      {/* Heading */}
      <h2 className="text-lg font-semibold text-card-foreground mb-2">
        {heading || config.heading}
      </h2>

      {/* Explanation */}
      <p className="text-sm text-card-foreground/60 mb-8 max-w-[280px]">
        {explanation || config.explanation}
      </p>

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full max-w-[240px]">
        {onPrimaryAction && (
          <Button
            onClick={onPrimaryAction}
            variant="outline"
            className="w-full min-h-[44px] bg-transparent border-border/40 text-muted-foreground hover:border-primary/60 hover:text-primary hover:bg-primary/5 text-sm gap-2"
          >
            {type === "api" || type === "general" ? (
              <RefreshCw className="w-4 h-4" />
            ) : type === "session" ? (
              <Home className="w-4 h-4" />
            ) : null}
            {primaryLabel || config.primaryLabel}
          </Button>
        )}

        {onSecondaryAction && secondaryLabel && (
          <button
            onClick={onSecondaryAction}
            className="text-xs text-card-foreground/50 hover:text-card-foreground/70 transition-colors underline underline-offset-2"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorState;
