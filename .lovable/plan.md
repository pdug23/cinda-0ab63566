
## Plan: Redesign Next Buttons to Match Back Button Styling

### Summary

Transform all "Next" buttons across the profile builder pages to match the styling of the "BACK" buttons: same font size (10px), font family, uppercase text ("NEXT"), and pill-shaped appearance.

---

### Files to Update

| File | Location |
|------|----------|
| `src/pages/ProfileBuilder.tsx` | Lines 398-405 |
| `src/pages/ProfileBuilderStep2.tsx` | Lines 399-408 |
| `src/pages/ProfileBuilderStep3.tsx` | Lines 832-839 |
| `src/pages/ProfileBuilderStep4a.tsx` | Lines 129-138 |
| `src/pages/ProfileBuilderStep4b.tsx` | Lines 838-846 |

---

### Technical Changes

Replace the current `<Button>` component with a styled `<button>` element that matches the BACK button exactly.

**Current styling:**
```tsx
<Button
  onClick={handleNext}
  variant="cta"
  className="w-full min-h-[44px] text-sm"
  disabled={!canProceed}
>
  Next
</Button>
```

**New styling:**
```tsx
<button
  type="button"
  onClick={handleNext}
  disabled={!canProceed}
  className="w-full h-10 flex items-center justify-center gap-2 rounded-full text-[10px] font-medium tracking-wider uppercase text-card-foreground/60 hover:text-card-foreground bg-card-foreground/[0.03] hover:bg-card-foreground/10 border border-card-foreground/20 transition-colors disabled:pointer-events-none disabled:opacity-50"
>
  NEXT
  <ArrowRight className="w-3.5 h-3.5" />
</button>
```

**Key style properties (matching BACK button):**
- `text-[10px]` - 10px font size
- `font-medium` - medium weight
- `tracking-wider` - wider letter spacing  
- `uppercase` - all caps display
- `rounded-full` - pill shape
- Full-width with centered content
- Arrow icon on the right (mirroring BACK's left arrow)

---

### Visual Result

The NEXT buttons will:
- Use 10px uppercase text ("NEXT") matching BACK
- Have the same pill-shaped border style
- Include a right arrow icon (opposite of BACK's left arrow)
- Maintain full width but with matching visual weight
- Keep the same disabled state handling

---

### Import Requirements

Each file will need `ArrowRight` imported from `lucide-react` (some already have it, others will need it added).
