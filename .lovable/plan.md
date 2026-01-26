
## Plan: Redesign Recommendation Toggle to X/+ Remove/Add Pattern

### Overview
Replace the current "SKIP/INCLUDE" toggle button with a new interaction pattern:
1. **Default state**: Show full recommendation card with an "X" button to remove
2. **On X click**: Show a confirmation warning modal
3. **After removal**: Show a collapsed, greyed-out summary with a "+" button to re-add

---

### Visual Design

**Default State (Included)**
```text
┌─────────────────────────────────────────────────────────┐
│ You'd benefit from a daily trainer              [  X  ]│
│                                                         │
│ A cushioned daily trainer would complement your         │
│ rotation for recovery and easy days.                    │
└─────────────────────────────────────────────────────────┘
```

**Removed State (Greyed Out Summary)**
```text
┌─────────────────────────────────────────────────────────┐
│ You'd benefit from a daily trainer              [  +  ]│
└─────────────────────────────────────────────────────────┘
(greyed out, single line, no reason text)
```

---

### Changes to `src/pages/ProfileBuilderStep4Analysis.tsx`

#### 1. Add state for removal confirmation modal
```tsx
const [removalTarget, setRemovalTarget] = useState<string | null>(null);
```
This tracks which archetype the user is trying to remove (null = modal closed).

#### 2. Create RemoveConfirmModal component
A small inline modal following the app's existing modal design pattern (matching UnsavedChangesModal styling):
- Title: "Remove this recommendation?"
- Body: "You can add it back at any time."
- Buttons: "Cancel" and "Remove"

#### 3. Replace NotForMeToggle with two new components

**RemoveButton** - An "X" icon button shown when the recommendation is included:
- Small circular button with X icon
- Positioned in the top-right of the recommendation card
- On click: Opens the confirmation modal (sets removalTarget)
- Disabled when this is the only remaining recommendation

**AddBackButton** - A "+" icon button shown on the collapsed summary:
- Small circular button with Plus icon
- On click: Immediately re-adds the archetype (no confirmation needed)

#### 4. Update the recommendation card rendering logic

**When included (full card)**:
```tsx
<div className="bg-card/80 rounded-lg p-4 border-2 border-slate-500/50">
  <div className="flex items-start justify-between gap-3">
    <p className="text-white">{getIntroText(archetype)}</p>
    <RemoveButton 
      onRemove={() => setRemovalTarget(archetype)}
      canRemove={canRemove}
    />
  </div>
  <p className="text-sm text-gray-300 mt-3">{reason}</p>
</div>
```

**When removed (collapsed summary)**:
```tsx
<div className="bg-card/40 rounded-lg px-4 py-3 border border-slate-600/30 opacity-60">
  <div className="flex items-center justify-between gap-3">
    <p className="text-slate-400 text-sm">
      You'd benefit from a <span className="font-medium">{formatArchetype(archetype).toLowerCase()}</span>
    </p>
    <AddBackButton onAdd={() => handleToggleArchetype(archetype)} />
  </div>
</div>
```

#### 5. Modal confirmation handler
```tsx
const handleConfirmRemoval = () => {
  if (removalTarget) {
    handleToggleArchetype(removalTarget);
    setRemovalTarget(null);
  }
};
```

---

### New Component: RemoveConfirmModal

Located inline within ProfileBuilderStep4Analysis.tsx (similar pattern to existing modals):

```tsx
const RemoveConfirmModal = () => (
  <Dialog open={!!removalTarget} onOpenChange={() => setRemovalTarget(null)}>
    <DialogContent className="max-w-sm bg-card border-border/20 p-0 gap-0">
      <DialogHeader className="p-4 pb-0 relative">
        <button
          onClick={() => setRemovalTarget(null)}
          className="absolute right-4 top-4 p-1 rounded-full ..."
        >
          <X className="w-4 h-4" />
        </button>
        <DialogTitle>Remove this recommendation?</DialogTitle>
      </DialogHeader>
      <div className="px-4 pt-4 pb-6">
        <p className="text-sm text-card-foreground/70">
          You can add it back at any time.
        </p>
      </div>
      <div className="flex gap-3 p-4 pt-0">
        <Button onClick={() => setRemovalTarget(null)}>Cancel</Button>
        <Button onClick={handleConfirmRemoval}>Remove</Button>
      </div>
    </DialogContent>
  </Dialog>
);
```

---

### Technical Details

| Item | Details |
|------|---------|
| **File** | `src/pages/ProfileBuilderStep4Analysis.tsx` |
| **New imports** | `Plus` from lucide-react, `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` from ui/dialog |
| **New state** | `removalTarget: string \| null` |
| **Components modified** | `NotForMeToggle` → replaced by `RemoveButton` + `AddBackButton` |
| **Components added** | `RemoveConfirmModal`, `RemoveButton`, `AddBackButton`, `CollapsedRecommendation` |
| **Lines affected** | ~390-460 (RecommendationBoxSection and NotForMeToggle) |

---

### Button Styling

**X Button (Remove)**
- Size: `w-6 h-6` circle
- Icon: `X` from lucide-react, size 14px
- Style: `bg-transparent border border-slate-600 text-slate-400 hover:border-red-500/60 hover:text-red-400`
- Disabled state: `opacity-40 cursor-not-allowed`

**+ Button (Add Back)**
- Size: `w-6 h-6` circle  
- Icon: `Plus` from lucide-react, size 14px
- Style: `bg-transparent border border-slate-500 text-slate-400 hover:border-primary/60 hover:text-primary`

---

### Summary of User Experience

1. User sees full recommendation cards with small "X" buttons in top-right
2. Clicking "X" opens a gentle confirmation: "Remove this recommendation? You can add it back at any time."
3. Clicking "Remove" collapses the card to a single-line greyed-out summary with "+" button
4. Clicking "+" immediately restores the full card (no confirmation needed for adding back)
5. At least one recommendation must remain - the "X" on the last included card is disabled
