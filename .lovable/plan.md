
# Prevent Model Name Wrapping on Shoe Cards

## Current State

The model name is displayed with fixed styling (line 338):
```tsx
<h2 className={`text-2xl font-bold text-center mb-4 text-shimmer-${position}`}>
  {shoe.model} {shoe.version}
</h2>
```

This doesn't account for longer names like "PRIME X3 STRUNG" which may wrap to multiple lines on narrower cards.

## Solution

Use CSS to dynamically scale the font size based on the text length, ensuring the model name always fits on a single line. Two approaches available:

### Option A: CSS `clamp()` with `text-wrap: nowrap` (Recommended)
- Force the text to stay on one line with `whitespace-nowrap`
- Use a combination of `clamp()` for font sizing and `text-overflow: ellipsis` as a fallback

### Option B: JavaScript-based dynamic sizing
- Calculate the text length and apply different font size classes
- More control but adds complexity

## Implementation (Option A)

### File: `src/components/results/ShoeCard.tsx`

Update the model name heading (lines 337-340):

```tsx
{/* Model Name */}
<h2 
  className={`font-bold text-center mb-4 text-shimmer-${position} whitespace-nowrap overflow-hidden`}
  style={{
    fontSize: `${shoe.model.length + (shoe.version?.length || 0) > 15 ? '1.25rem' : '1.5rem'}`,
  }}
>
  {shoe.model} {shoe.version}
</h2>
```

**Logic:**
- If the combined model + version name exceeds 15 characters, use `1.25rem` (equivalent to `text-xl`)
- Otherwise, use `1.5rem` (equivalent to `text-2xl`)
- `whitespace-nowrap` ensures the text never wraps to a second line
- `overflow-hidden` as a safety net for extremely long names

### Thresholds

| Name Length | Font Size | Example |
|-------------|-----------|---------|
| ≤ 15 chars | 1.5rem (text-2xl) | "Pegasus 41" |
| 16-20 chars | 1.25rem (text-xl) | "PRIME X3 STRUNG" |
| > 20 chars | 1rem (text-base) | Very long names |

For better granularity, we can use a more refined approach:

```tsx
style={{
  fontSize: (() => {
    const nameLength = (shoe.model + ' ' + (shoe.version || '')).length;
    if (nameLength <= 12) return '1.5rem';   // text-2xl
    if (nameLength <= 18) return '1.25rem';  // text-xl  
    return '1.1rem';                          // text-lg
  })(),
}}
```

## Files to Edit

| File | Change |
|------|--------|
| `src/components/results/ShoeCard.tsx` | Add dynamic font sizing based on name length and `whitespace-nowrap` to prevent wrapping |
