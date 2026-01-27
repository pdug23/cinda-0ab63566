

## Plan: Larger Font with White Text Stroke

### Changes

Increase the tagline font size to **40px** and add a subtle white text stroke to create a thicker, bolder appearance.

---

### Technical Implementation

**File:** `src/components/AnimatedTagline.tsx`

| Property | Current | New |
|----------|---------|-----|
| Font size | 28px | 40px |
| Text stroke | none | 0.5px white |

The white stroke will be applied using the CSS `-webkit-text-stroke` property, which adds an outline around each letter to make the text appear slightly thicker.

---

### Code Changes

Update the style object for each `<span>` element:

```tsx
style={{ 
  fontSize: "40px",
  fontWeight: 900,
  fontStyle: "italic",
  WebkitTextStroke: "0.5px white"  // Subtle white outline
}}
```

This will be applied in both the reduced-motion fallback and the main animated version.

---

### Visual Result

- Text is noticeably larger (40px vs 28px)
- White stroke adds subtle thickness without looking like an obvious outline
- Maintains the italic, extra-bold styling
- Works well against the dark background

