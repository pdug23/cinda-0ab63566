
# Make Shoe Images Look More Natural and Integrated

## Current State

The shoe images currently appear as flat, floating cutouts on the card with:
- Fixed 96px height
- No background or visual grounding
- No depth effects (shadows, reflections)
- Hard edges that contrast sharply with the dark card

## Options to Consider

### Option A: Subtle Shadow & Glow (Recommended)
Add a soft drop shadow beneath the shoe to create depth and ground it visually. This works well with product photography and matches the card's premium aesthetic.

### Option B: Gradient Background Pill
Place the shoe on a subtle gradient background shape (oval or rounded rectangle) to give it a "stage" effect.

### Option C: Reflection Effect
Add a faded reflection/mirror effect below the shoe image for a polished product showcase look.

### Option D: Combination Approach
Combine a soft shadow with a very subtle radial gradient background for maximum integration.

---

## Recommended Implementation: Option D (Combination)

Create a subtle radial gradient "glow" behind the shoe that matches the card's badge color, plus a soft shadow to ground it:

### Changes to `src/components/results/ShoeCard.tsx`

**Update the image container (lines 413-420):**

```tsx
{/* Shoe Image */}
<div 
  className="flex justify-center items-center pt-3 pb-1 relative"
  style={{
    // Subtle radial gradient that matches badge color for cohesion
    background: `radial-gradient(ellipse 80% 60% at center, ${badgeConfig.color}10 0%, transparent 70%)`,
  }}
>
  <img
    src={getShoeImagePath(shoe.model, shoe.version)}
    alt={`${shoe.brand} ${shoe.model} ${shoe.version}`}
    className="h-[96px] w-auto max-w-full object-contain relative z-10"
    style={{
      // Soft drop shadow for depth
      filter: "drop-shadow(0 8px 12px rgba(0, 0, 0, 0.4))",
    }}
  />
</div>
```

### Visual Effect Breakdown

| Effect | Purpose |
|--------|---------|
| `radial-gradient` with badge color at 10% opacity | Creates a subtle colored "spotlight" behind the shoe that ties it to the card's theme |
| `drop-shadow` with 8px blur | Grounds the shoe on the card, adding depth without harsh edges |
| Ellipse shape (80% wide, 60% tall) | Natural spotlight effect that's wider than tall |

### Why This Works

1. **Drop shadow** uses `filter: drop-shadow()` instead of `box-shadow`, which follows the actual shoe outline rather than creating a rectangular shadow
2. **Radial gradient** is very subtle (10% opacity) so it enhances without overwhelming
3. **Color coordination** ties the image section to the badge color for visual coherence
4. Works equally well for placeholder images and real product photos

### Alternative: Simpler Version

If the combination feels too busy, we can start with just the drop shadow:

```tsx
<img
  src={getShoeImagePath(shoe.model, shoe.version)}
  alt={...}
  className="h-[96px] w-auto max-w-full object-contain"
  style={{
    filter: "drop-shadow(0 6px 10px rgba(0, 0, 0, 0.35))",
  }}
/>
```

---

## Files to Edit

| File | Change |
|------|--------|
| `src/components/results/ShoeCard.tsx` | Update image container styling with gradient background and drop shadow |
