

# Cinda Logo Segment Animation Implementation

## Overview

Replace the basic spinning logo animation on the landing page with an elegant "explode and reassemble" animation where each of the 12 SVG segments moves outward from center then smoothly slots back into place in sequence.

## What Will Change

When clicking "FIND YOURS", instead of a simple spin:
1. Each segment bursts outward from center along its radial direction
2. Segments animate sequentially (12 → 1 → 2 → ... → 11) creating a wave effect
3. Each segment snaps back into place with a satisfying overshoot
4. Total animation duration: ~1.4 seconds

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/assets/cinda-segments.svg` | Create | Save the uploaded 12-segment SVG |
| `src/components/CindaLogoAnimated.tsx` | Create | New React component with inline SVG and segment animations |
| `tailwind.config.ts` | Modify | Add `segment-explode` keyframe animation |
| `src/pages/Landing.tsx` | Modify | Replace static `<img>` with `<CindaLogoAnimated>` component |

## Technical Details

### 1. SVG Component Structure

The component will embed the SVG inline (not as an image) so each segment can be targeted individually. Each of the 12 segments will receive:
- A CSS custom property for its outward direction (`--tx`, `--ty`)
- A staggered animation delay based on clock position
- The shared `segment-explode` animation

### 2. Direction Vectors

Each segment moves outward based on its clock position:

```typescript
const SEGMENT_DIRECTIONS = {
  12: { x: 0, y: -1 },      // Up
  1:  { x: 0.5, y: -0.87 },
  2:  { x: 0.87, y: -0.5 },
  3:  { x: 1, y: 0 },        // Right
  4:  { x: 0.87, y: 0.5 },
  5:  { x: 0.5, y: 0.87 },
  6:  { x: 0, y: 1 },        // Down
  7:  { x: -0.5, y: 0.87 },
  8:  { x: -0.87, y: 0.5 },
  9:  { x: -1, y: 0 },       // Left
  10: { x: -0.87, y: -0.5 },
  11: { x: -0.5, y: -0.87 },
};
```

### 3. Animation Keyframes (tailwind.config.ts)

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
- Duration: 800ms per segment
- Stagger delay: 50ms between segments
- Easing: `cubic-bezier(0.34, 1.56, 0.64, 1)` for snap-back overshoot

### 4. Landing Page Integration

Replace lines 103-109 in Landing.tsx:

```tsx
// Before
<img 
  src={cindaLogo} 
  alt="Cinda" 
  className={`h-[80px] absolute top-8 left-1/2 -translate-x-1/2 z-20 ${
    isExiting ? "animate-spin-settle" : ""
  }`}
/>

// After
<CindaLogoAnimated 
  isAnimating={isExiting}
  className="h-[80px] absolute top-8 left-1/2 -translate-x-1/2 z-20"
/>
```

### 5. Component Props

```typescript
interface CindaLogoAnimatedProps {
  isAnimating: boolean;    // Triggers the explode animation
  className?: string;      // Size and positioning
}
```

### 6. Accessibility

The component will detect `prefers-reduced-motion` and:
- Skip the explode animation entirely
- Show a simple fade transition instead

## Animation Timeline

```text
Time (ms)   0    50   100  150  200  250  300  350  400  ...  600  ...  800  ...  1400
            |----|----|----|----|----|----|----|----|----     |----     |----     |
Segment 12: [=======explode=======][=========return=========]
Segment 1:    [=======explode=======][=========return=========]
Segment 2:       [=======explode=======][=========return=========]
...
Segment 11:                                              [=======explode=======][return]
```

## Visual Result

When clicking "FIND YOURS":
1. Segments burst outward from center like a blooming flower
2. Each segment follows its radial direction (12 goes up, 3 goes right, etc.)
3. Sequential timing creates a satisfying "wave" effect around the logo
4. Segments snap back into place with a slight overshoot
5. Logo settles into position, fully assembled
6. Transition to orientation page begins

