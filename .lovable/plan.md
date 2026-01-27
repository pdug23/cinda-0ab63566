

## Plan: Vertical Stacked Tagline Animation

### Concept

Transform the tagline from horizontal inline text to a vertically stacked layout with larger typography. Each line animates in sequentially, filling the space between the logo and the button.

```text
Current (horizontal, 24px):
"Every runner deserves to find their perfect fit."

New (vertical stack, larger font):
Every
runner
deserves
to find
their
perfect
fit.
```

---

### Visual Layout

```text
┌─────────────────────────┐
│        [LOGO]           │  top-8
│                         │
│         Every           │  ← fade in first
│        runner           │  ← fade in 150ms later
│       deserves          │  ← fade in 300ms later
│        to find          │  ← ...
│         their           │
│        perfect          │
│          fit.           │  ← fade in last
│                         │
│     [FIND YOURS]        │  bottom-16
│   How does Cinda work?  │  bottom-6
└─────────────────────────┘
```

---

### Technical Changes

#### Update `AnimatedTagline.tsx`

**File: `src/components/AnimatedTagline.tsx`**

1. Change from word-by-word to line-by-line grouping
2. Stack lines vertically with `flex-col`
3. Increase font size to ~36-40px
4. Each line fades and floats up with stagger

```tsx
const lines = [
  "Every",
  "runner", 
  "deserves",
  "to find",
  "their",
  "perfect",
  "fit."
];

return (
  <h1 className="flex flex-col items-center gap-1">
    {lines.map((line, i) => (
      <span
        key={i}
        className={`block transition-all duration-500 ease-out ${
          shouldAnimate 
            ? "opacity-100 translate-y-0" 
            : "opacity-0 translate-y-4"
        }`}
        style={{ 
          transitionDelay: `${i * 120}ms`,
          fontSize: "36px",
          fontWeight: 900,
          fontStyle: "italic",
          fontVariantLigatures: "none"
        }}
      >
        {line}
      </span>
    ))}
  </h1>
);
```

---

#### Update `Landing.tsx`

**File: `src/pages/Landing.tsx`**

Adjust the container positioning - reduce top margin since the stacked text takes more vertical space:

```tsx
// Line 103: Change mt-[120px] to mt-[100px] or similar
<div className={`... mt-[100px]`}>
  <AnimatedTagline className="text-card-foreground/90 text-center" />
</div>
```

---

### Animation Timeline

| Line | Delay | Appears at |
|------|-------|------------|
| Every | 0ms | 0.0s |
| runner | 120ms | 0.12s |
| deserves | 240ms | 0.24s |
| to find | 360ms | 0.36s |
| their | 480ms | 0.48s |
| perfect | 600ms | 0.60s |
| fit. | 720ms | 0.72s |

Total animation completes in ~1.2 seconds (720ms delay + 500ms transition).

---

### Files Changed

| File | Change |
|------|--------|
| `src/components/AnimatedTagline.tsx` | Switch to vertical layout with larger font, line-by-line animation |
| `src/pages/Landing.tsx` | Adjust top margin for stacked layout |

---

### Visual Result

- The tagline fills the vertical space between logo and button
- Each line animates in sequentially, creating a cascading reveal effect
- Larger 36px font makes the statement bold and impactful
- Maintains the italic, extra-bold branding style
- Respects reduced motion preferences (instant display)

