
# Fix "null" Version and Clean Up Rotation Modal

## Issues to Fix

1. **"Vomero Plus null" bug** - When `shoe.version` is `null`, it displays as the literal string "null"
2. **Remove sentiment icons** - Per user request
3. **Add scrollability** - Ensure the modal handles many shoes gracefully

---

## Solution

### File: `src/pages/ProfileBuilderStep3.tsx`

**1. Fix the null version display (line 917)**

```tsx
// From
const modelDisplay = `${item.shoe.model} ${item.shoe.version}`.trim();

// To
const modelDisplay = [item.shoe.model, item.shoe.version].filter(Boolean).join(" ");
```

This uses `filter(Boolean)` to remove any null/undefined/empty values before joining, so "Vomero Plus" + null becomes just "Vomero Plus".

**2. Remove sentiment icon (line 936)**

Delete this line:
```tsx
{getSentimentIcon(item.sentiment)}
```

**3. Add scroll container with max height**

Wrap the shoe list in a scroll area with a sensible max height (e.g., 240px - enough for ~4 shoes before scrolling):

```tsx
// From
<div className="px-4 pt-4 pb-6 space-y-2">
  {currentShoes.map((item) => { ... })}
</div>

// To
<div className="px-4 pt-4 pb-6">
  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
    {currentShoes.map((item) => { ... })}
  </div>
</div>
```

The `max-h-60` (240px) allows ~4 shoes to display before scrolling. The `pr-1` adds a small right padding so the scrollbar doesn't overlap the cards.

---

## Summary

| Fix | Change |
|-----|--------|
| Null version | Use `filter(Boolean).join(" ")` pattern |
| Sentiment icons | Remove the icon element |
| Scrollability | Add `max-h-60 overflow-y-auto` wrapper |
