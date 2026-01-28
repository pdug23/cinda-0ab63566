
# Fix Modal Width and Button Styling

## Problem
The modals (`LeaveRecommendationsModal`, `UnsavedChangesModal`) are:
1. Too wide on phone screens (using `max-w-sm` which is 384px)
2. Using sentence case "Leave" / "Stay" instead of CAPS
3. Not matching the BACK/SKIP button aesthetic

## Solution

### 1. Fix Modal Width
Change from `max-w-sm` to `w-[calc(100%-48px)] max-w-[320px]` to match other modals in the app (ProfileBuilderStep3, Chat restart dialog, etc.). This ensures 24px padding on each side of the phone screen.

### 2. Update Button Styling to Match BACK/SKIP Aesthetic

Current BACK/SKIP button style (the target):
```
h-7 px-3 flex items-center gap-2 rounded-full text-[10px] font-medium 
tracking-wider uppercase text-card-foreground/60 hover:text-card-foreground 
bg-card-foreground/[0.03] hover:bg-card-foreground/10 border 
border-card-foreground/20 transition-colors
```

Adapt for modal buttons:
- Pill shape (`rounded-full`)
- Uppercase text (`uppercase`)
- 10px font (`text-[10px]`)
- Wider tracking (`tracking-wider`)
- Same hover effect with orange glow

### Files to Update

| File | Changes |
|------|---------|
| `src/components/LeaveRecommendationsModal.tsx` | Width fix, button styling for "LEAVE" and "STAY" |
| `src/components/UnsavedChangesModal.tsx` | Width fix, button styling for "DISCARD" and "STAY" |

### Button Style Change
```tsx
// From
className="flex-1 min-h-[44px] text-sm bg-transparent border-border/40 
text-muted-foreground hover:border-primary/60 hover:text-primary 
hover:bg-primary/5"

// To
className="flex-1 h-9 rounded-full text-[10px] font-medium tracking-wider 
uppercase text-card-foreground/60 hover:text-card-foreground 
bg-card-foreground/[0.03] hover:bg-card-foreground/10 border 
border-card-foreground/20 hover:border-primary/60 hover:text-primary 
transition-colors"
```

---

## Technical Details

### DialogContent Width Update
```tsx
// From
<DialogContent className="max-w-sm bg-card border-border/20 p-0 gap-0">

// To  
<DialogContent className="w-[calc(100%-48px)] max-w-[320px] bg-card border-border/20 p-0 gap-0">
```

This matches the pattern used in:
- ProfileBuilderStep3 modals
- ProfileBuilderStep3b confirmation modal
- Chat restart dialog
