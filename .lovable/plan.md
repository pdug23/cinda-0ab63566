

# Cinda Logo Segment Animation

## Overview

Replace the basic spinning logo animation on the landing page with an elegant "explode and reassemble" animation where each of the 12 segments moves outward from center then smoothly slots back into place in sequence.

## Animation Concept

When the user clicks "FIND YOURS":
1. Each segment moves **outward** from the center along its radial direction (like clock hands pointing outward)
2. Segments animate **sequentially** in clock order (12 → 1 → 2 → ... → 11)
3. After reaching max distance, each segment **returns** to its original position
4. Creates a satisfying "assembly" visual as the logo reassembles

```text
        ┌───────────────────────────────────────────┐
        │                                           │
        │     12     PHASE 1: Explode outward       │
        │    ↗  ↖    (segments move away from       │
        │  11    1    center in sequence)           │
        │  ↖      ↗                                 │
        │ 10  ●  2                                  │
        │  ↙      ↘                                 │
        │   9    3                                  │
        │    ↘  ↙                                   │
        │      ...                                  │
        │                                           │
        │     12     PHASE 2: Reassemble            │
        │    ↘  ↗    (segments return to center     │
        │  11    1    in sequence)                  │
        │   →      ←                                ││ 10  ●  2                                  │
        │   ←      →                                │
        │   9    3                                  │
        │    ↗  ↘                                   │
        │      ...                                  │
        │                                           │
        └───────────────────────────────────────────┘
```

## Technical Implementation

### 1. Create Animated SVG Logo Component

**New file: `src/components/CindaLogoAnimated.tsx`**

A React component that:
- Embeds the SVG inline (not as an image) so we can animate individual segments
- Uses CSS transforms to move each segment
- Applies staggered animation delays for sequential effect
- Respects `prefers-reduced-motion`

### 2. Animation Mechanics

For each segment, calculate its outward direction based on clock position:

```typescript
// Direction vectors for each clock position (12 = top, 3 = right, etc.)
const SEGMENT_DIRECTIONS: Record<number, { x: number; y: number }> = {
  12: { x: 0, y: -1 },    // Up
  1:  { x: 0.5, y: -0.87 },
  2:  { x: 0.87, y: -0.5 },
  3:  { x: 1, y: 0 },     // Right
  4:  { x: 0.87, y: 0.5 },
  5:  { x: 0.5, y: 0.87 },
  6:  { x: 0, y: 1 },     // Down
  7:  { x: -0.5, y: 0.87 },
  8:  { x: -0.87, y: 0.5 },
  9:  { x: -1, y: 0 },    // Left
  10: { x: -0.87, y: -0.5 },
  11: { x: -0.5, y: -0.87 },
};
```

### 3. CSS Keyframes Animation

**File: `tailwind.config.ts`**

Add new keyframe animation:

```typescript
'segment-explode': {
  '0%': { 
    transform: 'translate(0, 0)',
    opacity: '1'
  },
  '40%': { 
    transform: 'translate(var(--tx), var(--ty))',
    opacity: '0.7'
  },
  '100%': { 
    transform: 'translate(0, 0)',
    opacity: '1'
  }
}
```

Animation properties:
- Total duration: ~800ms
- Stagger delay: ~50ms per segment (12 segments × 50ms = 600ms total stagger)
- Ease: `cubic-bezier(0.34, 1.56, 0.64, 1)` (slight overshoot for snap-back feel)

### 4. Component Props

```typescript
interface CindaLogoAnimatedProps {
  isAnimating: boolean;    // Triggers the animation
  className?: string;      // Size/position styling
  onAnimationComplete?: () => void;  // Callback when done
}
```

### 5. Landing Page Integration

**File: `src/pages/Landing.tsx`**

Replace the static logo image with the animated component:

```tsx
// Before
<img 
  src={cindaLogo} 
  alt="Cinda" 
  className={`h-[80px] ... ${isExiting ? "animate-spin-settle" : ""}`}
/>

// After
<CindaLogoAnimated 
  isAnimating={isExiting}
  className="h-[80px] absolute top-8 left-1/2 -translate-x-1/2 z-20"
/>
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/CindaLogoAnimated.tsx` | Create | New animated SVG logo component with 12 individually-animated segments |
| `src/assets/cinda-segments.svg` | Create | Copy uploaded SVG to project assets |
| `tailwind.config.ts` | Modify | Add `segment-explode` keyframe animation |
| `src/pages/Landing.tsx` | Modify | Replace static logo with animated component |

## Animation Timeline

```text
Time (ms)   0    50   100  150  200  250  300  350  400  450  500  550  600  700  800
            |----|----|----|----|----|----|----|----|----|----|----|----|----|----|
Segment 12: [=======explode=======][=========return=========]
Segment 1:    [=======explode=======][=========return=========]
Segment 2:       [=======explode=======][=========return=========]
Segment 3:          [=======explode=======][=========return=========]
...
Segment 11:                                              [=======explode=======][==return==]
```

## Reduced Motion Support

When `prefers-reduced-motion: reduce` is active:
- Skip the explode animation entirely
- Show a simple fade transition instead
- Maintains accessibility compliance

## Visual Result

When clicking "FIND YOURS":
1. Segments burst outward from center like a blooming flower
2. Each segment follows its radial direction (12 goes up, 3 goes right, etc.)
3. Sequential timing creates a satisfying "wave" effect around the logo
4. Segments snap back into place with a slight overshoot
5. Logo settles into position, fully assembled
6. Transition to orientation page begins

This creates a much more premium, engaging experience compared to the current basic spin.

