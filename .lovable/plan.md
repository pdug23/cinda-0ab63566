

# Make Container Invisible on Loading and Recommendations Pages

## Overview

Keep the `OnboardingLayout` container structure (for safe-area handling and scroll locking) but make it visually invisible on two specific pages:

1. **ProfileBuilderStep4Analysis** (the loading/analysis page before recommendations)
2. **Recommendations** (the shoe cards page)

This preserves the functional benefits while letting the content appear to float on the animated background.

---

## Technical Approach

Add a new prop `invisible` to `OnboardingLayout` that removes all visual styling (background, border, shadow, max-width constraints) while keeping the structural behaviour intact.

---

## Changes

### 1. Update OnboardingLayout Component

**File:** `src/components/OnboardingLayout.tsx`

Add a new `invisible` prop that removes:
- Background colour
- Border
- Shadow
- Rounded corners
- Max-width constraint (so content can use full width)

```text
Props to add:
  invisible?: boolean  // Removes all visual styling

When invisible=true:
- Container classes: bg-transparent border-transparent shadow-none rounded-none
- Remove max-w-lg constraint
- Keep height constraints and safe-area padding
```

### 2. Update ProfileBuilderStep4Analysis

**File:** `src/pages/ProfileBuilderStep4Analysis.tsx`

Change the `OnboardingLayout` usage to include `invisible` prop:

```text
Line 630:
Current: <OnboardingLayout scrollable>
New:     <OnboardingLayout scrollable invisible>
```

### 3. Update Recommendations Page

**File:** `src/pages/Recommendations.tsx`

Change the `OnboardingLayout` usage to include `invisible` prop:

```text
Line 668:
Current: <OnboardingLayout scrollable={!loading} allowOverflow={!loading}>
New:     <OnboardingLayout scrollable={!loading} allowOverflow={!loading} invisible>
```

---

## Visual Result

| Page | Before | After |
|------|--------|-------|
| Analysis/Loading | Dark card container visible | Content floats on animated background |
| Recommendations | Dark card container visible | Shoe cards appear directly on background |

The shoe cards already have their own styling (borders, backgrounds, glows) so they will serve as their own visual containers.

---

## What's Preserved

- Safe-area padding (iOS notch/home indicator)
- Body scroll locking
- Flex layout structure
- Height constraints (prevents content from extending beyond viewport)
- Transition timing for reveal animations

