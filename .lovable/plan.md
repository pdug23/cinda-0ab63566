
# Step 1: Force Document Scrollability with 160px Bottom Space

## Confirmation

**Yes, this applies globally to every page.** The `src/index.css` file is imported in `src/main.tsx` (the app entry point), so these styles affect:
- Landing page
- All ProfileBuilder steps
- Chat page
- Recommendations page
- Any other routes

---

## Technical Changes

### File: `src/index.css` (lines 167-205)

**Replace the existing html, body, and body::after blocks with:**

```css
  html {
    background-color: var(--app-bg);
    height: auto;
    min-height: 100%;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    margin: 0;
    padding: 0;
  }

  body {
    position: relative;
    height: auto;
    min-height: 100%;
    margin: 0;
    padding: 0;
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    background: var(--app-bg);
    color: hsl(var(--foreground));
    padding-left: var(--safe-area-left);
    padding-right: var(--safe-area-right);
  }

  /* Empty space at end of body to force document scrollability on iOS PWA */
  body::after {
    content: "";
    display: block;
    height: 160px;
  }
```

---

## What Changes

| Before | After |
|--------|-------|
| `min-height: 100vh/100dvh/-webkit-fill-available` | `height: auto; min-height: 100%` |
| Fixed-position safe-area shim | 160px block element for scroll space |

---

## What Stays Unchanged

- `#root` styling
- All CSS variables
- Nested scroll containers
- AnimatedBackground component
- All other existing safe-area CSS variables

---

## Testing After Implementation

1. Remove existing Cinda app from home screen
2. Re-add via Share → Add to Home Screen
3. Verify the body is now scrollable (you should be able to scroll ~160px)
4. Check if the grey bar is gone
