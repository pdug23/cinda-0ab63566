
## Plan: Fix Mobile Space Utilization

### The Problem

The container is not utilizing the full screen height on mobile devices. This is caused by:

1. **`maxHeight: 720px`** - Caps the container well below modern iPhone heights (812px-932px)
2. **Fixed 16px padding** on top and bottom (32px total beyond safe areas)
3. **Bottom spacer always reserves 32px** via `min-h-[32px]`, even when there's no disclaimer text

### The Solution

Make three targeted changes to `OnboardingLayout.tsx`:

---

### Change 1: Increase maxHeight

**File:** `src/components/OnboardingLayout.tsx` (line 88)

```tsx
// Before
maxHeight: "720px",

// After  
maxHeight: "844px",
```

This allows the container to grow taller on modern phones (iPhone 14 Pro Max is 932px, iPhone 12/13/14 is 844px).

---

### Change 2: Reduce outer padding

**File:** `src/components/OnboardingLayout.tsx` (lines 78-79)

```tsx
// Before
paddingTop: "calc(env(safe-area-inset-top) + 16px)",
paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)",

// After
paddingTop: "calc(env(safe-area-inset-top) + 8px)",
paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)",
```

And update the height calculation on line 87:

```tsx
// Before
height: "calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 32px)",

// After
height: "calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 16px)",
```

This reclaims 16px of vertical space while still respecting safe areas.

---

### Change 3: Make bottom spacer conditional

**File:** `src/components/OnboardingLayout.tsx` (lines 95-102)

```tsx
// Before - always reserves 32px
<div className="mt-4 min-h-[32px] flex items-start justify-center">
  {bottomText && (
    <p className="text-xs italic text-orange-400/50 ...">
      {bottomText}
    </p>
  )}
</div>

// After - only renders when bottomText exists
{bottomText && (
  <div className="mt-2 flex items-start justify-center">
    <p className="text-xs italic text-orange-400/50 text-center max-w-md px-4 transition-opacity duration-200">
      {bottomText}
    </p>
  </div>
)}
```

When there's no disclaimer text, no space is reserved. When there is text, it takes only the space it needs.

---

### Result

| Metric | Before | After |
|--------|--------|-------|
| Max container height | 720px | 844px |
| Outer padding (beyond safe areas) | 32px | 16px |
| Bottom spacer when no text | 32px | 0px |
| **Total space reclaimed** | - | **up to 80px** |

The container will now fill more of the available screen on modern phones, with the disclaimer text only taking space when it's actually displayed.

---

### Files Modified

| File | Changes |
|------|---------|
| `src/components/OnboardingLayout.tsx` | Increase maxHeight, reduce padding, conditional bottom spacer |
