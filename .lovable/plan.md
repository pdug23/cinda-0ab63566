

## Fix: Orientation Screen Layout - Logo, Spacing, and Button Overlap

### Issues Identified

Looking at your screenshot, I can see three problems:

1. **Logo is missing** - The logo only renders when `viewState === "landing"`, so it disappears after you click "Find yours"
2. **Too much wasted space at the top** - Content starts at `mt-[170px]` (170px from top), which leaves a large empty gap
3. **Text clipping buttons** - The steps content extends into the button area because the buttons are positioned at `bottom-20` (80px from bottom)

---

### Solution

#### 1. Show Logo on Orientation View

**File: `src/pages/Landing.tsx`**

Move the logo outside the `viewState === "landing"` condition so it shows on both views:

```tsx
// Current (lines 88-97) - only shows on landing
{viewState === "landing" && (
  <img src={cindaLogo} ... />
)}

// New - show on both landing AND orientation (always visible)
<img 
  src={cindaLogo} 
  alt="Cinda" 
  className={`h-[80px] absolute top-8 left-1/2 -translate-x-1/2 z-20 ${
    isExiting ? "animate-spin-settle" : ""
  }`}
/>
```

Also change `top-[60px]` to `top-8` (32px) to reduce top spacing.

---

#### 2. Reduce Content Top Margin

**File: `src/pages/Landing.tsx`**

Change the orientation content's top margin from `mt-[170px]` to `mt-[120px]`:

| Location | Current | New |
|----------|---------|-----|
| Line 134 (orientation container) | `mt-[170px]` | `mt-[120px]` |
| Line 105 (landing content) | `mt-[170px]` | `mt-[120px]` |

This moves the text up by 50px, giving more room for the buttons.

---

#### 3. Move Buttons Up

**File: `src/pages/Landing.tsx`**

Change the CTA buttons position from `bottom-20` (80px) to `bottom-16` (64px):

```tsx
// Line 187 - change bottom-20 to bottom-16
className={`absolute bottom-16 left-1/2 ...`}
```

Also adjust the orientation bottom link from `bottom-6` to `bottom-5` to keep visual balance.

---

### Summary of Changes

| Line | Element | Current | New |
|------|---------|---------|-----|
| 89-97 | Logo condition | `viewState === "landing"` | Always visible (no condition) |
| 93 | Logo position | `top-[60px]` | `top-8` |
| 105 | Landing content margin | `mt-[170px]` | `mt-[120px]` |
| 134 | Orientation content margin | `mt-[170px]` | `mt-[120px]` |
| 187 | CTA buttons position | `bottom-20` | `bottom-16` |
| 231 | A2HS link position | `bottom-6` | `bottom-5` |

---

### Visual Result

- Logo appears at the top on both splash and orientation screens
- Text content is positioned higher, closer to the logo
- Buttons have more breathing room and don't overlap with the numbered steps
- Bottom link stays visible below the buttons

