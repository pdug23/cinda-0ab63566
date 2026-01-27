
## Plan: Fix Grey Bar at Bottom of Screen

### Understanding the Problem

There are two separate issues causing the grey bar:

**Issue 1: Browser Mode (Safari)**
The grey bar behind Safari's URL bar doesn't match the app background. Safari uses the `<meta name="theme-color">` to color this area.

**Issue 2: PWA/Standalone Mode**
The container is still capped at `maxHeight: 844px` even in standalone mode because the `isStandalone()` check is being evaluated at the wrong time or returning `false` incorrectly.

---

### Solution

#### Fix 1: Match the theme-color to the background

Update the `theme-color` meta tag to use the exact same color as the body background.

**File: `index.html` (line 21)**

```html
<!-- Before -->
<meta name="theme-color" content="#1f1f1f" />

<!-- After - exact match for hsl(0, 0%, 12%) -->
<meta name="theme-color" content="#1e1e1e" />
```

Also update the body inline style to use the same hex value for consistency:

**File: `index.html` (line 34)**

```html
<!-- Before -->
<body style="background-color: hsl(0, 0%, 12%);">

<!-- After -->
<body style="background-color: #1e1e1e;">
```

---

#### Fix 2: Make PWA detection reactive with useState

Move the standalone detection inside the component and use `useState` so it evaluates correctly on the client.

**File: `src/components/OnboardingLayout.tsx`**

```tsx
// Before - function defined at module level
const isStandalone = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
};

const OnboardingLayout = ({ ... }) => {
  // ...
  style={{
    maxHeight: isStandalone() ? "none" : "844px",
  }}
}
```

```tsx
// After - detection happens inside component with useState
const OnboardingLayout = ({ ... }) => {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running as installed PWA
    const standalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
  }, []);

  // ...
  style={{
    maxHeight: isStandalone ? "none" : "844px",
  }}
}
```

This ensures the detection runs on the client after the component mounts.

---

#### Fix 3: Update CSS to use consistent colors

**File: `src/index.css` (line 162)**

```css
/* Before */
html {
  background-color: hsl(0 0% 12%);
}

/* After */
html {
  background-color: #1e1e1e;
}
```

---

### Summary of Changes

| File | Change |
|------|--------|
| `index.html` | Update `theme-color` to `#1e1e1e`, update body background to match |
| `src/components/OnboardingLayout.tsx` | Make `isStandalone` detection reactive using `useState` and `useEffect` |
| `src/index.css` | Update html background to `#1e1e1e` for consistency |

### Expected Result

- **Browser mode**: Safari's URL bar area will blend with the app background (no grey bar visible)
- **PWA mode**: Container will extend to full height with no wasted space at bottom
