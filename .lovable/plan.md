

## Plan: Two-Line Floating Wave Tagline

### Concept

Display the tagline across two lines, centred vertically between the logo and the button, with a gentle floating wave animation.

```text
Line 1: "Every runner deserves"
Line 2: "to find their perfect fit."
```

---

### Visual Layout

```text
┌─────────────────────────────────┐
│           [LOGO]                │  ← top-8 (fixed)
│                                 │
│                                 │
│                                 │
│     Every runner deserves       │  ← wave phase 0°
│   to find their perfect fit.    │  ← wave phase 180°
│                                 │
│                                 │
│                                 │
│        [FIND YOURS]             │  ← bottom-16 (fixed)
│    How does Cinda work?         │  ← bottom-6 (fixed)
└─────────────────────────────────┘
```

---

### Animation Details

**Initial Reveal:** Each line fades in with a staggered delay

**Continuous Wave:** After reveal, both lines float gently:
- Each line moves ~6px up and down
- Animation duration: 3 seconds per cycle
- Lines are offset by half a phase (180°), creating a see-saw wave effect
- Subtle, hypnotic, premium feel

---

### Technical Changes

#### 1. Add Wave Keyframes to `tailwind.config.ts`

```ts
keyframes: {
  'float-wave': {
    '0%, 100%': { transform: 'translateY(0px)' },
    '50%': { transform: 'translateY(-6px)' }
  }
}

animation: {
  'float-wave': 'float-wave 3s ease-in-out infinite'
}
```

---

#### 2. Update `AnimatedTagline.tsx`

**Changes:**
- Split tagline into two lines instead of individual words
- Use larger font (~28-32px)
- Stack lines vertically with `flex-col`
- Two-phase animation: fade-in reveal, then continuous wave
- Each line has a different wave phase offset

```tsx
const lines = [
  "Every runner deserves",
  "to find their perfect fit."
];

// Phase 1: Fade in
// Phase 2: Wave animation with offset delays
<span
  className={`block ${waveActive ? "animate-float-wave" : "..."}`}
  style={{ 
    animationDelay: waveActive ? `${i * 1.5}s` : `${i * 200}ms`
  }}
>
  {line}
</span>
```

---

#### 3. Update `Landing.tsx` Positioning

**Changes:**
- Centre tagline container absolutely between logo and button
- Use `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`

---

### Animation Timeline

| Phase | Time | Effect |
|-------|------|--------|
| Reveal | 0-0.7s | Lines fade in (200ms stagger) |
| Pause | 0.7-1.2s | Brief pause |
| Wave | 1.2s+ | Continuous floating wave |

---

### Files Changed

| File | Change |
|------|--------|
| `tailwind.config.ts` | Add `float-wave` keyframe and animation |
| `src/components/AnimatedTagline.tsx` | Two-line layout, wave animation |
| `src/pages/Landing.tsx` | Centre tagline vertically |

---

### Visual Result

- Tagline centred between logo and button on two lines
- Lines fade in sequentially on load
- After reveal, text gently waves with a subtle see-saw motion
- Creates a floating, premium feel that draws the eye

