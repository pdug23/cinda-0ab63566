

## Plan: Animate the Landing Tagline

### The Challenge
The splash screen has significant blank space between the logo (at `top-8`) and the tagline (at `mt-[120px]`), with more space below the tagline before the "Find yours" button at `bottom-16`.

### Animation Options

Here are three approaches, ranked by visual impact and complexity:

---

### Option A: Word-by-Word Fade-In with Stagger (Recommended)

Each word fades and floats up individually with a staggered delay, creating an elegant reveal that takes about 2-3 seconds to complete.

**Visual effect:**
- Words appear one at a time, each fading in while moving upward slightly
- Creates a "building" sensation that fills the space with motion
- Feels premium and intentional

**Implementation:**
1. Split the tagline into individual words
2. Render each word as a `<span>` with its own animation
3. Use CSS animations with `animation-delay` for stagger timing
4. Add new keyframes for `fade-up-word` animation

```text
Timeline:
  "Every"    ████░░░░░░░░░░░░░░░░
  "runner"   ░░░░████░░░░░░░░░░░░
  "deserves" ░░░░░░░░████░░░░░░░░
  ...etc
```

---

### Option B: Typewriter with Blinking Cursor

Use the existing `TypewriterText` component with a visible cursor, giving an "AI writing" feel.

**Visual effect:**
- Text appears word by word (already have this component)
- Add a blinking cursor at the end during typing
- Cursor fades out after completion

**Trade-offs:**
- Simpler to implement (component exists)
- Less visually "filling" - just text appearing in place
- May feel too similar to the Chat step's typewriter

---

### Option C: Scale + Fade with Line Breaks

Display the tagline across multiple lines, with each line animating in sequence.

**Visual effect:**
```text
Line 1: "Every runner"        [scales in]
Line 2: "deserves to find"    [scales in after delay]
Line 3: "their perfect fit."  [scales in after delay]
```

**Trade-offs:**
- Fills vertical space more naturally
- Changes the typography layout
- May feel too dramatic for the minimalist aesthetic

---

### Recommended: Option A (Word-by-Word Fade-In)

This approach fills the space with motion while keeping the single-line typography intact.

---

### Technical Changes

#### 1. Add new keyframes to `tailwind.config.ts`

```ts
// New keyframe
'fade-up-word': {
  '0%': {
    opacity: '0',
    transform: 'translateY(12px)'
  },
  '100%': {
    opacity: '1',
    transform: 'translateY(0)'
  }
}

// New animation
'fade-up-word': 'fade-up-word 0.5s ease-out forwards'
```

---

#### 2. Create `AnimatedTagline` component

**File: `src/components/AnimatedTagline.tsx`**

A new component that:
- Splits the tagline into words
- Renders each word with staggered `animation-delay`
- Respects `prefers-reduced-motion` (shows all words instantly)

```tsx
const words = "Every runner deserves to find their perfect fit.".split(" ");

// Each word gets increasing delay: 0ms, 150ms, 300ms, etc.
{words.map((word, i) => (
  <span
    key={i}
    className="inline-block opacity-0 animate-fade-up-word"
    style={{ animationDelay: `${i * 150}ms` }}
  >
    {word}
  </span>
))}
```

---

#### 3. Update `Landing.tsx`

Replace the static `<h1>` with the new `AnimatedTagline` component:

```tsx
// Before (line 105-110)
<h1 className="text-card-foreground/90 ...">
  Every runner deserves to find their perfect fit.
</h1>

// After
<AnimatedTagline 
  className="text-card-foreground/90 max-w-md leading-tight italic text-center"
/>
```

---

### Summary of Changes

| File | Change |
|------|--------|
| `tailwind.config.ts` | Add `fade-up-word` keyframe and animation |
| `src/components/AnimatedTagline.tsx` | New component for word-by-word reveal |
| `src/pages/Landing.tsx` | Replace static h1 with AnimatedTagline |

---

### Visual Result

- The tagline animates word-by-word over ~1.2 seconds
- Each word floats up slightly as it fades in
- The animation fills the "dead time" when users first land on the page
- Respects reduced motion preferences (instant display)
- Maintains the minimalist aesthetic while adding polish

