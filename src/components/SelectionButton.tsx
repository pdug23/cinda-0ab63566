import { cn } from "@/lib/utils";

interface SelectionButtonProps {
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  className?: string;
}

export const SelectionButton = ({
  label,
  description,
  selected,
  onClick,
  className,
}: SelectionButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full min-h-[56px] p-4 rounded-lg text-left transition-all duration-200",
        "bg-card-foreground/5 border",
        selected
          ? "border-orange-500/50 shadow-[0_0_12px_rgba(251,146,60,0.15)]"
          : "border-card-foreground/20 hover:border-card-foreground/30 hover:bg-card-foreground/[0.07]",
        className
      )}
    >
      <span
        className={cn(
          "block text-sm font-medium transition-colors",
          selected ? "text-orange-400" : "text-card-foreground/90"
        )}
      >
        {label}
      </span>
      <span className="block text-xs text-card-foreground/50 mt-1">
        {description}
      </span>
    </button>
  );
};
