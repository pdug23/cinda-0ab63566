
# Center Logo Vertically in Rotation Confirmation Cards

## Issue
The brand logo is positioned near the top of its container rather than being vertically centered with the shoe name and run type text.

## Solution

### File: `src/pages/ProfileBuilderStep3.tsx`

**1. Change flex alignment (line 923)**

```tsx
// From
className="flex items-start gap-3 p-3 rounded-lg ..."

// To  
className="flex items-center gap-3 p-3 rounded-lg ..."
```

**2. Remove the top margin from the logo (line 929)**

```tsx
// From
className="h-4 w-auto opacity-60 mt-0.5 flex-shrink-0 brightness-0 invert"

// To
className="h-4 w-auto opacity-60 flex-shrink-0 brightness-0 invert"
```

## Result
The logo will be vertically centered with the two-line text block (model name + run types).
