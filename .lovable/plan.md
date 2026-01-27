

## Plan: Remove Disclaimer and Extend Container

### Summary
Remove the disclaimer text from Profile Step 1 and Step 2 pages, and reclaim the vertical space by removing the reserved spacer from `OnboardingLayout`.

---

### Technical Changes

#### 1. Remove `bottomText` from ProfileBuilder.tsx (Step 1)

**File: `src/pages/ProfileBuilder.tsx`**

Line 236 currently passes `bottomText` to the layout:
```tsx
<OnboardingLayout 
  scrollable 
  bottomText={allOptionalsFilled ? null : "Completing optional fields will help Cinda better recommend shoes for how you run."}
>
```

Change to:
```tsx
<OnboardingLayout scrollable>
```

Also remove the related variable calculation (lines 226-229):
```tsx
const hasAge = age.trim() !== "";
const hasHeight = heightCm !== null;
const hasWeight = weightKg !== null;
const allOptionalsFilled = hasAge && hasHeight && hasWeight;
```

---

#### 2. Remove `bottomText` from ProfileBuilderStep2.tsx (Step 2)

**File: `src/pages/ProfileBuilderStep2.tsx`**

Line 237 currently passes `bottomText`:
```tsx
<OnboardingLayout 
  scrollable
  bottomText={allOptionalsFilled ? null : "Completing optional fields will help Cinda better recommend shoes for how you run."}
>
```

Change to:
```tsx
<OnboardingLayout scrollable>
```

Also remove the related variable calculation (lines 227-230):
```tsx
const hasVolume = volumeInput.trim() !== "";
const hasRaceTime = raceTime !== null;
const allOptionalsFilled = isBeginner || (hasVolume && hasRaceTime);
```

---

#### 3. Update OnboardingLayout to Extend Container

**File: `src/components/OnboardingLayout.tsx`**

Remove the `bottomText` prop and the bottom spacer div (lines 86-93):
```tsx
{/* Bottom spacer - always present for consistent layout */}
<div className="mt-4 min-h-[32px] flex items-start justify-center">
  {bottomText && (
    <p className="text-xs italic text-orange-400/50 text-center max-w-md px-4 transition-opacity duration-200">
      {bottomText}
    </p>
  )}
</div>
```

Update the container height calculation to reclaim the 48px (32px spacer + 16px margin):
```tsx
// Before
height: "calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 32px)"

// After (32px → ~0px, reclaiming ~48px total)
height: "calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 16px)"
```

Also update maxHeight from 720px to accommodate the extra space:
```tsx
maxHeight: "768px"
```

Remove the `bottomText` prop from the interface (line 16).

---

### Files Changed

| File | Change |
|------|--------|
| `src/pages/ProfileBuilder.tsx` | Remove `bottomText` prop and `allOptionalsFilled` calculation |
| `src/pages/ProfileBuilderStep2.tsx` | Remove `bottomText` prop and `allOptionalsFilled` calculation |
| `src/components/OnboardingLayout.tsx` | Remove `bottomText` prop, delete spacer div, extend container height |

---

### Visual Result

- The container will be taller on mobile (additional ~48px reclaimed)
- No disclaimer text appears below the card on either Step 1 or Step 2
- More space available for form content without scrolling

