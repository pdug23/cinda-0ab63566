
# Add Quick-Access Navigation Buttons to Step 4

## Overview

Add two utility buttons at the bottom of the Step 4 page that allow users to quickly navigate back to update their information without repeatedly pressing the back button:

1. **Update my rotation** → navigates to `/profile/step3`
2. **Update my info** → navigates to `/profile` (Step 1)

These buttons will be styled distinctly from the three main service options to make it clear they're utility/navigation shortcuts, not primary actions.

## User Experience

```text
┌────────────────────────────────────────┐
│  [BACK]        [Cinda]         [ ]     │
├────────────────────────────────────────┤
│                                        │
│  Profile complete. How can Cinda help? │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ 🔮 Recommend me a shoe           │  │  ← Primary service options
│  └──────────────────────────────────┘  │    (slate-blue styling)
│  ┌──────────────────────────────────┐  │
│  │ 🔄 Check my rotation             │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │ 🎯 Find by shoe type             │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ────────────────────────────────────  │
│                                        │
│  [Edit my rotation]  [Update my info]  │  ← Utility buttons (subtle styling)
│                                        │
└────────────────────────────────────────┘
```

## Styling Approach

The utility buttons will be styled as subtle, text-based links rather than the prominent glass-morphism cards:

- **Color**: Muted text with subtle border (no background fill)
- **Size**: Smaller, more compact
- **Layout**: Two buttons side-by-side at the bottom
- **Icons**: Pencil/edit icons to indicate "update" action
- **Hover**: Subtle highlight, no dramatic effects

This clearly differentiates them from the main "service" options while keeping them accessible.

## Technical Implementation

### File to Modify

`src/pages/ProfileBuilderStep4.tsx`

### Changes

1. **Import Pencil icon** from lucide-react for the edit buttons

2. **Add navigation handlers**:
   - `handleEditRotation` → navigates to `/profile/step3`
   - `handleEditInfo` → navigates to `/profile`

3. **Add utility button section** below the mode cards:
   - Separator or spacing to distinguish from primary options
   - Two inline buttons with muted styling
   - Text like "Edit my rotation" and "Update my info"

### Utility Button Styling

```tsx
// Subtle, compact utility button styling
<button
  type="button"
  onClick={handleEditRotation}
  className={cn(
    "flex-1 py-2 px-4 rounded-lg text-xs font-medium",
    "text-card-foreground/50 hover:text-card-foreground/70",
    "bg-transparent hover:bg-card-foreground/5",
    "border border-card-foreground/10 hover:border-card-foreground/20",
    "transition-all duration-200",
    "flex items-center justify-center gap-2"
  )}
>
  <Pencil className="w-3 h-3" />
  Edit rotation
</button>
```

### Visual Distinction Summary

| Aspect | Primary Cards | Utility Buttons |
|--------|---------------|-----------------|
| Size | Large (p-5) | Compact (py-2 px-4) |
| Background | Glass morphism | Transparent |
| Border | Slate blue glow | Very subtle |
| Icons | 24px custom SVGs | 12px Pencil |
| Text | Bold labels + desc | Small text only |
| Hover | Scale + glow | Subtle highlight |

## Button Labels

Suggested labels (concise and action-oriented):
- "Edit rotation" (links to Step 3)
- "Edit profile" (links to Step 1)

Or alternatively:
- "Update shoes" / "Update info"
