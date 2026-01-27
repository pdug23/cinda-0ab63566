

## Plan: Restore Logo on Orientation View

### The Problem

When implementing the previous plan, the logo was accidentally hidden on the orientation view by adding this condition:

```tsx
{viewState === "landing" && (
  <img src={cindaLogo} ... />
)}
```

This means the logo only shows on the landing view, not on orientation.

### The Fix

Change the condition so the logo is visible on **both** the landing and orientation views:

**File: `src/pages/Landing.tsx` (line 89)**

From:
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

To:
```tsx
<img 
  src={cindaLogo} 
  alt="Cinda" 
  className={`h-[80px] absolute top-[60px] left-1/2 -translate-x-1/2 z-20 ${
    isExiting ? "animate-spin-settle" : ""
  }`}
/>
```

Simply remove the conditional wrapper so the logo is always visible (on both landing and orientation).

### Result

- Logo appears at `top-[60px]` on landing page
- When user clicks "FIND YOURS", the logo performs the spin-settle animation
- Logo remains in place on the orientation page

### Files Modified

| File | Change |
|------|--------|
| `src/pages/Landing.tsx` | Remove the `viewState === "landing"` condition from the logo |

