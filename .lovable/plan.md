

# Fix iOS Input Zoom on Step3b

## Problem

When you tap into the chat text box on `/profile/step3b`, iOS Safari automatically zooms in the page. This is a well-known iOS behavior that occurs when input fields have a font-size smaller than 16px. The current textarea uses `text-sm` (14px).

## Solution

Increase the textarea font-size to 16px on mobile devices to prevent the auto-zoom behavior while keeping the current 14px (`text-sm`) on desktop where this isn't an issue.

## Technical Details

**File:** `src/pages/ProfileBuilderStep3b.tsx`

**Current code (line 388-391):**
```tsx
className={cn(
  "flex-1 w-full bg-transparent resize-none text-sm leading-relaxed",
  ...
)}
```

**Updated code:**
```tsx
className={cn(
  "flex-1 w-full bg-transparent resize-none text-base md:text-sm leading-relaxed",
  ...
)}
```

**What this does:**
- `text-base` = 16px font-size on mobile (prevents iOS zoom)
- `md:text-sm` = 14px font-size on tablet/desktop (keeps original design)

This is the standard solution for the iOS input zoom issue and requires no viewport meta tag changes (which can break accessibility).

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/ProfileBuilderStep3b.tsx` | Change `text-sm` to `text-base md:text-sm` on the textarea |

