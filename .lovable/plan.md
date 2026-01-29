

# Hide "Add Cinda as a web app" Link When Already Using PWA

## Overview

When users have already installed Cinda as a web app (PWA), showing the "Add Cinda as a web app" link is redundant and potentially confusing. We'll detect standalone/PWA mode and hide the link accordingly.

## How It Works

We can detect if the app is running as a PWA using two methods:

1. **Standard browsers**: CSS media query `(display-mode: standalone)`
2. **iOS Safari**: `navigator.standalone` property

## Changes

### File: `src/pages/Landing.tsx`

**Add PWA detection state and effect:**

```tsx
const [isStandalone, setIsStandalone] = useState(false);

useEffect(() => {
  // Check if running as installed PWA
  const isInStandaloneMode = 
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
  
  setIsStandalone(isInStandaloneMode);
}, []);
```

**Update the conditional rendering (line 205):**

```tsx
{/* Web app promotion link - hidden in standalone/PWA mode */}
{!isExiting && !isStandalone && (
  <button ...>
    Add Cinda as a web app for an optimal experience
  </button>
)}
```

## Technical Notes

- `(display-mode: standalone)` - Works on Chrome, Edge, Firefox, and Android browsers
- `navigator.standalone` - iOS Safari specific property (needs type assertion)
- The check runs once on mount since standalone mode won't change during a session

## Files to Edit

| File | Change |
|------|--------|
| `src/pages/Landing.tsx` | Add `isStandalone` state and detection logic, update conditional rendering |

