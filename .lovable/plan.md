

## Plan: Add Time Estimates Under Buttons & Remove Logo from Orientation

### Changes Overview

Two small updates to the orientation view on the landing page:

1. **Add subtle time estimates** beneath each button
2. **Remove the logo** from the orientation view (keep it on the landing/splash screen)

---

### Visual Result

```text
┌─────────────────────────────────────────┐
│                                         │
│   [Full analysis ↗]    [Quick match]    │
│      ~5 minutes           ~1 minute     │
│                                         │
└─────────────────────────────────────────┘
```

---

### Technical Changes

**File: `src/pages/Landing.tsx`**

#### 1. Make Logo Conditional (Hide on Orientation)

The logo element (lines 88-95) will be wrapped in a condition to only show on the landing view:

```tsx
{viewState === "landing" && (
  <img 
    src={cindaLogo} 
    alt="Cinda" 
    className={`h-[80px] absolute top-[60px] left-1/2 -translate-x-1/2 z-20 ${
      isExiting ? "animate-spin-settle" : ""
    }`}
  />
)}
```

#### 2. Restructure Buttons with Time Estimates

Replace the current side-by-side button layout (lines 189-204) with a structure that includes time estimates beneath each button:

```tsx
<div className="flex flex-col sm:flex-row gap-4 w-full">
  {/* Full analysis column */}
  <div className="flex-1 flex flex-col items-center gap-1.5">
    <Button
      onClick={handleStartProfile}
      variant="cta"
      className="w-full min-h-[44px] text-sm bg-primary/10 border-primary/30 ..."
    >
      Full analysis <LogIn className="w-3.5 h-3.5 ml-1" />
    </Button>
    <span className="text-xs text-muted-foreground/60">~5 minutes</span>
  </div>
  
  {/* Quick match column */}
  <div className="flex-1 flex flex-col items-center gap-1.5">
    <Button
      onClick={() => navigateWithTransition("/quick-match")}
      variant="cta"
      className="w-full min-h-[44px] text-sm"
    >
      Quick match
    </Button>
    <span className="text-xs text-muted-foreground/60">~1 minute</span>
  </div>
</div>
```

---

### Styling Details

| Element | Style |
|---------|-------|
| Time text | `text-xs text-muted-foreground/60` (small, subtle, 60% opacity) |
| Gap between button and time | `gap-1.5` (6px) |
| Column gap | `gap-4` (16px) - slightly increased for breathing room |

---

### Files Modified

| File | Change |
|------|--------|
| `src/pages/Landing.tsx` | Conditionally hide logo on orientation view; add time estimate spans under each button |

