
# Add Info Tooltips to Shoe Card Specs

## Overview

Add subtle info icons to each spec category label (Weight, Drop, Plate, Tier) that reveal explanatory tooltips when tapped/clicked. This helps users understand what each metric means without cluttering the UI.

## Design Approach

### Pattern: Inline (i) Icon + Tooltip

Following the existing pattern used for the ST badge, add a small info icon next to each spec label that triggers a tooltip:

```text
┌─────────────────────────────────────────────────┐
│  WEIGHT ⓘ    DROP ⓘ    PLATE ⓘ    TIER ⓘ      │
│   light       8mm       none       $$$$         │
└─────────────────────────────────────────────────┘
```

**Why Tooltip over Popover:**
- Tooltips are lighter-weight and less disruptive
- Perfect for short explanations (1-2 sentences)
- Works well on both desktop (hover) and mobile (tap)
- Takes zero additional space when not active

### Icon Styling
- Use a very small info icon (w-2.5 h-2.5)
- Subtle opacity (50%) so it doesn't compete with the label
- Position inline after the label text
- Use existing `TooltipProvider` already in the component

## Tooltip Content

Each metric gets a concise explanation:

| Metric | Tooltip Content |
|--------|-----------------|
| **Weight** | "How heavy the shoe feels on foot, from very light (race-focused) to heavy (max cushion)." |
| **Drop** | "The height difference between heel and toe. Lower drops encourage midfoot striking; higher drops suit heel strikers." |
| **Plate** | "Stiff plates (carbon, nylon, plastic) add propulsion and efficiency. 'None' means a traditional foam-only midsole." |
| **Tier** | "Price category: $ (budget) to $$$$ (premium race-day). Higher tiers typically use advanced foams and materials." |

## Technical Implementation

### File: `src/components/results/ShoeCard.tsx`

Update the specs grid section (lines 506-527) to wrap each label in a Tooltip:

```tsx
{/* Specs Grid */}
<div className="grid grid-cols-4 gap-2 mb-3">
  <div className="text-center">
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wide mb-1 cursor-help" style={{ color: textColorSubtle }}>
          Weight
          <Info className="w-2.5 h-2.5 opacity-50" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px] text-xs">
        How heavy the shoe feels on foot, from very light (race-focused) to heavy (max cushion).
      </TooltipContent>
    </Tooltip>
    <span className="block text-sm font-medium" style={{ color: textColorMuted }}>{weightLabel}</span>
  </div>
  {/* ...repeat for Drop, Plate, Tier */}
</div>
```

### Styling Details

- **Tooltip styling**: Use existing dark theme (`bg-card border-border/40 text-card-foreground`)
- **Max width**: `max-w-[200px]` to keep tooltips compact
- **Side**: `side="top"` so tooltip appears above and doesn't overlap the card edge
- **Cursor**: `cursor-help` to indicate interactivity

### Mobile Consideration

Radix Tooltip works on tap for mobile devices. The existing `TooltipProvider` is already wrapping other elements in this component, so we can reuse it or add another provider scope for the specs section.

## Visual Result

```text
Before:
┌─────────────────────────────────────────────────┐
│    WEIGHT       DROP       PLATE       TIER     │
│     light       8mm        none        $$$$     │
└─────────────────────────────────────────────────┘

After:
┌─────────────────────────────────────────────────┐
│  WEIGHT ⓘ    DROP ⓘ    PLATE ⓘ    TIER ⓘ      │
│   light       8mm       none       $$$$         │
└─────────────────────────────────────────────────┘

On tap/hover:
┌─────────────────────────────────────────────────┐
│           ┌─────────────────────────┐           │
│           │ The height difference   │           │
│           │ between heel and toe... │           │
│           └──────────┬──────────────┘           │
│  WEIGHT ⓘ   [DROP ⓘ]   PLATE ⓘ    TIER ⓘ      │
│   light       8mm       none       $$$$         │
└─────────────────────────────────────────────────┘
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/results/ShoeCard.tsx` | Update specs grid to add Tooltip wrappers with Info icons and explanatory content |

## Benefits

1. **Zero space impact** - Icons are tiny, tooltips only appear on interaction
2. **Educational** - Helps new runners understand shoe terminology
3. **Consistent** - Uses same tooltip pattern as existing ST badge
4. **Accessible** - Works with keyboard focus and screen readers
