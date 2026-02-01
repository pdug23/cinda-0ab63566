
# Reposition Tooltip to Bottom-Right with Clear Border

## Changes

### 1. Tooltip Positioning

Move the tooltip from the left side of the button to spawning from the **bottom-right corner**:

**Current**: Positioned to the left with arrow pointing right
```
[Tooltip] → [Button]
```

**New**: Positioned below and slightly right with arrow pointing up to the button
```
      [Button]
         ↑
    [Tooltip]
```

### 2. Clearer Border

Add a more visible border so it stands out against the dark background:
- Change from `border-border/30` to a more prominent `border-border/60` or use a lighter color like `border-slate-500/50`

### 3. Updated Text

Change the message to your suggested text (with minor polish):
- **New text**: "More to say? Tap here anytime to add or update your info."

## Technical Details

**File: `src/components/CindaChatButton.tsx`**

Changes to the tooltip div:
- Position: Change from `right-full mr-3` to `top-full right-0 mt-2` (places it below the button, aligned to the right edge)
- Border: Change to `border-border/60` or `border-slate-400/40` for better visibility
- Arrow: Rotate the CSS triangle to point upward instead of right, positioned at the top-right corner of the bubble
- Text: Update to the new copy

### Arrow CSS Change

Current arrow (pointing right):
```css
border-y-[6px] border-y-transparent border-l-[6px] border-l-card
```

New arrow (pointing up, at top-right):
```css
position: top-0, right-3, -translate-y-full
border-x-[6px] border-x-transparent border-b-[6px] border-b-card
```

## Visual Layout

```text
         [Cinda Logo Button]
                  \
                   \
              ┌─────────────────┐
              │ More to say?    │
              │ Tap here anytime│
              │ to add or update│ [X]
              │ your info.      │
              └─────────────────┘
```

## File to Modify

| File | Changes |
|------|---------|
| `src/components/CindaChatButton.tsx` | Reposition tooltip to bottom-right, update border opacity, change text, flip arrow direction |
