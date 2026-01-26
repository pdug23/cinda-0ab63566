
## Plan: Update "Not for me" Toggle Button

### Changes to `src/pages/ProfileBuilderStep4Analysis.tsx`

#### 1. Update the `NotForMeToggle` Component (lines 433-456)

**Text changes:**
- Make text uppercase: "NOT FOR ME" / "INCLUDE"
- When `isSkipped` is `false` (item is included): Show "SKIP" 
- When `isSkipped` is `true` (item is excluded): Show "INCLUDE"

**Size changes:**
- Reduce text size from `text-xs` to a custom smaller size using explicit font sizing

```tsx
// Updated NotForMeToggle component
const NotForMeToggle = ({
  isSkipped,
  onToggle,
  canSkip,
}: {
  isSkipped: boolean;
  onToggle: () => void;
  canSkip: boolean;
}) => (
  <button
    onClick={() => canSkip && onToggle()}
    disabled={!canSkip && !isSkipped}
    className={cn(
      "px-2.5 py-0.5 rounded-full border transition-all whitespace-nowrap flex-shrink-0",
      "text-[10px] tracking-wide font-medium",
      isSkipped
        ? "bg-slate-500/30 border-slate-400 text-white"
        : "bg-transparent border-slate-600 text-slate-400 hover:border-slate-500",
      !canSkip && !isSkipped && "opacity-40 cursor-not-allowed"
    )}
  >
    {isSkipped ? "INCLUDE" : "SKIP"}
  </button>
);
```

### Summary of Visual Changes
| State | Current Text | New Text | Size |
|-------|-------------|----------|------|
| Included (default) | "Not for me" | "SKIP" | Smaller (10px) |
| Excluded (skipped) | "Not for me" | "INCLUDE" | Smaller (10px) |

### Technical Details
- **File**: `src/pages/ProfileBuilderStep4Analysis.tsx`
- **Lines affected**: 433-456 (NotForMeToggle component)
- **Font size**: Changed from `text-xs` (12px) to `text-[10px]` (10px)
- **Added**: `tracking-wide` for better readability at small size, `font-medium` for weight
- **Padding**: Slightly reduced from `px-3 py-1` to `px-2.5 py-0.5` to match smaller text
