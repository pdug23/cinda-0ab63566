

## Plan: Replace Drift with Ripple Animation

### Concept

Replace the current gentle drift animation with a water-ripple effect:
- Ripple originates from top-left corner (like a stone dropping into water)
- Wave spreads diagonally across the text
- Subtle refraction/bounce back from the opposite corner
- Continuous loop with a pause between ripples

---

### Technical Approach

Use CSS `@keyframes` with a combination of:
1. **Scale pulse** - Subtle expansion/contraction mimicking water displacement
2. **Transform origin** - Set to top-left so the ripple emanates from that point
3. **Skew** - Slight distortion as the "wave" passes through
4. **Multi-phase animation** - Initial ripple → settle → refract back → settle

---

### Animation Keyframes

```css
@keyframes ripple-wave {
  0%, 100% {
    transform: scale(1) skew(0deg, 0deg);
  }
  /* Initial ripple from top-left */
  8% {
    transform: scale(1.008) skew(0.3deg, 0.2deg);
  }
  16% {
    transform: scale(0.997) skew(-0.2deg, -0.1deg);
  }
  /* Wave reaches bottom-right, starts refraction */
  30% {
    transform: scale(1) skew(0deg, 0deg);
  }
  /* Refraction wave coming back */
  42% {
    transform: scale(1.005) skew(-0.2deg, -0.15deg);
  }
  50% {
    transform: scale(0.998) skew(0.15deg, 0.1deg);
  }
  /* Settle */
  65% {
    transform: scale(1) skew(0deg, 0deg);
  }
  /* Pause until next ripple */
}
```

Key characteristics:
- **Subtle values**: Scale changes of 0.2-0.8%, skew of 0.1-0.3 degrees
- **Transform origin**: `top left` so distortion emanates from that corner
- **Duration**: ~8 seconds for a relaxed, organic feel
- **Pause**: 35% of the animation is stillness before the next ripple

---

### Changes to AnimatedTagline.tsx

1. **Remove** `driftActive` state and `drift-gentle` keyframes
2. **Add** new `ripple-wave` keyframes
3. **Apply** ripple animation to the `<h1>` container after fade-in completes
4. **Set** `transform-origin: top left` on the animated element

---

### Files to Modify

| File | Change |
|------|--------|
| `src/components/AnimatedTagline.tsx` | Replace drift animation with ripple-wave animation |

