
# Enhance "Confirm your rotation" Modal

## Current State
The modal currently displays shoes as a plain text list:
```
Nike Vaporfly Next% 4
HOKA Clifton 10
```

This is minimal and doesn't confirm the details the user entered.

---

## Proposed Design

Transform each shoe into a small, informative card showing:
1. **Brand logo** (small, 16-20px height) - reuse the `getBrandLogoPath` pattern from ShoeCard
2. **Model name** (without brand, since logo shows it)
3. **Run types** as small text or pill badges
4. **Sentiment icon** (Heart/Meh/ThumbsDown) in the appropriate color

### Visual Layout

```text
┌─────────────────────────────────────────────────┐
│  Confirm your rotation                      ✕   │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ [Nike logo]  Vaporfly Next% 4       ❤️    │  │
│  │ Races • Workouts                          │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ [HOKA logo]  Clifton 10             😐    │  │
│  │ Recovery • Long runs                      │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │            LOOKS GOOD                   │    │
│  └─────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────┐    │
│  │             GO BACK                     │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Implementation Details

### File: `src/pages/ProfileBuilderStep3.tsx`

**1. Add brand logo helper function** (reuse the same mapping from ShoeCard)

```tsx
const getBrandLogoPath = (brand: string): string => {
  const brandMap: Record<string, string> = {
    "Adidas": "/logos/adidas-logo.png",
    "Altra": "/logos/altra-logo.png",
    "ASICS": "/logos/asics-logo.png",
    "Brooks": "/logos/brooks-logo.png",
    "HOKA": "/logos/hoka-logo.png",
    "Mizuno": "/logos/mizuno-logo.png",
    "New Balance": "/logos/newbalance-logo.png",
    "Nike": "/logos/nike-logo.png",
    "On": "/logos/on-logo.png",
    "PUMA": "/logos/puma-logo.png",
    "Salomon": "/logos/salomon-logo.png",
    "Saucony": "/logos/saucony-logo.png",
    "Skechers": "/logos/skechers-logo.png",
    "Topo Athletic": "/logos/topo-logo.png",
  };
  return brandMap[brand] || "";
};
```

**2. Add helper to format run types for display**

```tsx
const formatRunTypesForDisplay = (runTypes: RunType[]): string => {
  // If "all_my_runs" is selected, just show "All runs"
  if (runTypes.includes("all_my_runs")) {
    const hasTrail = runTypes.includes("trail");
    return hasTrail ? "All runs + Trail" : "All runs";
  }
  
  // Otherwise show individual types
  const labels: Record<RunType, string> = {
    all_my_runs: "All runs",
    recovery: "Recovery",
    long_runs: "Long runs",
    workouts: "Workouts",
    races: "Races",
    trail: "Trail",
  };
  
  return runTypes.map(rt => labels[rt]).join(" • ");
};
```

**3. Add sentiment icon helper**

```tsx
const getSentimentIcon = (sentiment: ShoeSentiment | null) => {
  switch (sentiment) {
    case "love": return <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />;
    case "neutral": return <Meh className="w-3.5 h-3.5 text-amber-400" />;
    case "dislike": return <ThumbsDown className="w-3.5 h-3.5 text-slate-400" />;
    default: return null;
  }
};
```

**4. Update the modal content** (lines 864-872)

Replace the simple `<ul>` list with styled shoe cards:

```tsx
<div className="px-4 pt-4 pb-6 space-y-2">
  {currentShoes.map((item) => {
    const logoPath = getBrandLogoPath(item.shoe.brand);
    const modelDisplay = `${item.shoe.model} ${item.shoe.version}`.trim();
    
    return (
      <div 
        key={item.shoe.shoe_id} 
        className="flex items-start gap-3 p-3 rounded-lg bg-card-foreground/[0.03] border border-card-foreground/10"
      >
        {/* Brand logo */}
        {logoPath && (
          <img 
            src={logoPath} 
            alt={item.shoe.brand}
            className="h-4 w-auto opacity-60 mt-0.5 flex-shrink-0"
          />
        )}
        
        {/* Shoe info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-card-foreground font-medium truncate">
              {modelDisplay}
            </span>
            {getSentimentIcon(item.sentiment)}
          </div>
          <p className="text-xs text-card-foreground/50 mt-0.5">
            {formatRunTypesForDisplay(item.runTypes)}
          </p>
        </div>
      </div>
    );
  })}
</div>
```

---

## Summary

| Element | Display |
|---------|---------|
| **Brand** | Small logo (16px height, 60% opacity) |
| **Model** | Model + version (e.g., "Vaporfly Next% 4") |
| **Sentiment** | Colored icon (Heart/Meh/ThumbsDown) |
| **Run types** | Compact text with bullet separators |
| **Card style** | Subtle background, rounded corners, matches app aesthetic |

This gives users a clear visual confirmation of what they've entered before proceeding.
