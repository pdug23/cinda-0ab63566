

# Fix Conditional Back Navigation from Recommendations

## Problem

When a user enters via **Quick Match** and lands on `/recommendations`, clicking "Try Again" incorrectly sends them to `/profile/step4` (a page they never visited). The back button should return them to `/quick-match`.

Users coming from the **full profile flow** should continue going back to `/profile/step4`.

## Solution

Pass the origin route as navigation state when navigating to `/recommendations`, then use that state to determine where the back button should go.

---

## Changes

### 1. QuickMatch.tsx — Pass origin state

**File:** `src/pages/QuickMatch.tsx` (line 418)

```tsx
// Before
navigate("/recommendations");

// After
navigate("/recommendations", { state: { from: "/quick-match" } });
```

---

### 2. ProfileBuilderStep4b.tsx — Pass origin state

**File:** `src/pages/ProfileBuilderStep4b.tsx` (lines 753 and 756)

```tsx
// Before
navigate("/recommendations");

// After
navigate("/recommendations", { state: { from: "/profile/step4" } });
```

---

### 3. Recommendations.tsx — Read state and conditionally navigate

**File:** `src/pages/Recommendations.tsx`

**Step A:** Import `useLocation` from react-router-dom (line 2)

```tsx
import { useNavigate, useLocation } from "react-router-dom";
```

**Step B:** Read the navigation state at the top of the component (around line 406)

```tsx
const location = useLocation();
const fromRoute = (location.state as { from?: string } | null)?.from || "/profile/step4";
```

**Step C:** Update the `goBack` function to use the dynamic route (lines 426-428)

```tsx
const goBack = useCallback(() => {
  handleNavigationAttempt(fromRoute);
}, [handleNavigationAttempt, fromRoute]);
```

---

## Summary

| File | Change |
|------|--------|
| `src/pages/QuickMatch.tsx` | Pass `{ state: { from: "/quick-match" } }` when navigating |
| `src/pages/ProfileBuilderStep4b.tsx` | Pass `{ state: { from: "/profile/step4" } }` when navigating |
| `src/pages/Recommendations.tsx` | Read the `from` state and use it for back navigation |

This ensures the back button respects the user's actual entry point while maintaining the existing behavior for full-flow users.

