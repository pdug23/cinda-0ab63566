
# Update Loading Pages with Cinda Logo Animation

## Overview

Replace the current loading animations on both the Rotation Analysis and Recommendations pages with a centered Cinda logo that has a "spin, stop, spin, stop" animation cycle. The Recommendations page will retain its rotating text messages but with updated typography.

---

## Changes

### 1. Create New Animation: `spin-stop-cycle`

Add a new keyframe animation to `tailwind.config.ts` that creates a repeating spin-pause cycle:

- Spin 360° over 0.6 seconds
- Pause for 0.8 seconds
- Repeat

```text
Timeline:
|--spin--|--pause--|--spin--|--pause--|
   0.6s     0.8s     0.6s     0.8s   ...
```

Total cycle duration: 2.8 seconds (0.6s spin + 0.8s pause × 2)

---

### 2. Create Shared Logo Loader Component

Create a new component `src/components/CindaLogoLoader.tsx` that:
- Displays the Cinda logo centered
- Applies the spin-stop-cycle animation
- Respects `prefers-reduced-motion`

---

### 3. Update Rotation Analysis Loading State

In `src/pages/ProfileBuilderStep4Analysis.tsx`:
- Replace the `LoadingSkeleton` component with the new `CindaLogoLoader`
- Center the loader in the available space

---

### 4. Update Recommendations Loading State

In `src/pages/Recommendations.tsx`:
- Replace `LiquidMetalLoader` with `CindaLogoLoader` in the `LoadingState` function
- Keep the rotating text messages
- Update text styling from `font-light italic tracking-wide` to use the app's standard typography (Plus Jakarta Sans, regular weight, consistent sizing)

---

## File Changes Summary

| File | Change |
|------|--------|
| `tailwind.config.ts` | Add `spin-stop-cycle` keyframes and animation |
| `src/components/CindaLogoLoader.tsx` | New file - reusable logo loader with spin animation |
| `src/pages/ProfileBuilderStep4Analysis.tsx` | Replace `LoadingSkeleton` with `CindaLogoLoader` |
| `src/pages/Recommendations.tsx` | Replace `LiquidMetalLoader` with `CindaLogoLoader`, update text styling |

---

## Technical Details

### New Animation Keyframes (tailwind.config.ts)

```typescript
'spin-stop-cycle': {
  '0%': { transform: 'rotate(0deg)' },
  '21.4%': { transform: 'rotate(360deg)' },  // 0.6s of 2.8s total = spin complete
  '50%': { transform: 'rotate(360deg)' },     // pause
  '71.4%': { transform: 'rotate(720deg)' },   // second spin complete
  '100%': { transform: 'rotate(720deg)' }     // pause
}
```

Animation: `'spin-stop-cycle': 'spin-stop-cycle 2.8s ease-out infinite'`

### CindaLogoLoader Component

```typescript
import { useEffect, useState } from "react";
import cindaLogo from "@/assets/cinda-logo-grey.png";

export function CindaLogoLoader() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPrefersReducedMotion(
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    }
  }, []);

  return (
    <div className="flex items-center justify-center">
      <img 
        src={cindaLogo} 
        alt="Loading..." 
        className={`h-20 ${prefersReducedMotion ? "" : "animate-spin-stop-cycle"}`}
      />
    </div>
  );
}
```

### Updated LoadingState in Recommendations.tsx

```typescript
function LoadingState() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % loadingMessages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-12 px-4">
      {/* Cinda Logo Animation */}
      <CindaLogoLoader />

      {/* Rotating loading messages - updated typography */}
      <p 
        key={messageIndex}
        className="text-base text-muted-foreground/70 animate-fade-in"
      >
        {loadingMessages[messageIndex]}
      </p>
    </div>
  );
}
```

### Updated Loading State in ProfileBuilderStep4Analysis.tsx

Replace `LoadingSkeleton` usage with:

```typescript
{status === "loading" && (
  <div className="flex flex-col items-center justify-center animate-in fade-in duration-300 flex-1">
    <CindaLogoLoader />
  </div>
)}
```
