
# Improve Cinda Chat Button Styling & Positioning

## Current Issues

1. **Shape mismatch**: The Cinda button is a perfect circle (`w-9 h-9 rounded-full`), while the Back button is a pill shape (`h-7 px-3 rounded-full`)
2. **Position**: Currently centered, but should align to the right
3. **Layout conflict**: On pages with right-side buttons (like Recommendations), need to handle placement gracefully

## Proposed Solution

### Option A: Match the Pill Shape (Recommended)

Transform the Cinda button from a circle to a pill that matches the Back button's style:

```text
Current:    [BACK]     (●)     [    ]
                       ↑ circle

Proposed:   [BACK]           [CINDA]
                               ↑ pill shape with logo + text
```

**Styling:**
- Same height as Back button: `h-7`
- Same padding pattern: `px-3`
- Same border/background treatment
- Add "CINDA" text label next to the logo
- Same `rounded-full` for pill effect

### Option B: Pill Without Text

If text feels too busy, use the same dimensions but keep logo-only:

```text
[BACK]                [●●]
                       ↑ wider pill, no text
```

**Styling:**
- `h-7 px-2.5 rounded-full` (matching height, slightly wider for the logo)

---

## Layout Strategy

### Standard Layout (Right-Aligned Cinda)

For most pages with just a Back button:

```text
[BACK]                    [CINDA]
  ↑                          ↑
left-aligned            right-aligned
```

**Implementation:**
```tsx
<header className="flex items-center justify-between">
  <BackButton />
  <CindaChatButton />  {/* Naturally goes to right */}
</header>
```

### With Right Button (Recommendations page)

When there's already a right button like "PROFILE":

```text
[BACK]           [CINDA]  [PROFILE]
                    ↑         ↑
            near-right    far-right
```

**Implementation:** Add a `rightAction` prop to CindaChatButton or group buttons:
```tsx
<header className="flex items-center justify-between">
  <BackButton />
  <div className="flex items-center gap-2">
    <CindaChatButton />
    <ProfileButton />
  </div>
</header>
```

---

## Technical Changes

### File: `src/components/CindaChatButton.tsx`

Update button styling to match pill format:

```tsx
// Current
"w-9 h-9 rounded-full"

// New (Option A - with text)
"h-7 px-3 flex items-center gap-2 rounded-full"
+ Add <span>CINDA</span> text

// New (Option B - logo only pill)
"h-7 px-2.5 rounded-full"
```

Match the subtle styling of Back button:
- `bg-card-foreground/[0.03]`
- `hover:bg-card-foreground/10`
- `border border-card-foreground/20`
- `text-[10px] font-medium tracking-wider uppercase` (if adding text)

### File: `src/pages/ProfileBuilderStep4.tsx`

Update header layout:
- Remove center positioning logic
- Remove the spacer div
- Let Cinda button naturally align right

### File: `src/pages/Recommendations.tsx`

Update header to group Cinda + Profile buttons on the right:
```tsx
<header className="flex items-center justify-between">
  <BackButton onClick={goBack} />
  <div className="flex items-center gap-2">
    <CindaChatButton />
    {!loading && <ProfileButton onClick={handleGoToProfile} />}
  </div>
</header>
```

---

## Visual Comparison

### Before
```text
┌────────────────────────────────────────┐
│  [BACK]           (●)          [    ]  │
│    ↑               ↑              ↑    │
│  pill          circle         spacer   │
└────────────────────────────────────────┘
```

### After (Option A - with text)
```text
┌────────────────────────────────────────┐
│  [BACK]                       [CINDA]  │
│    ↑                             ↑     │
│  pill                          pill    │
└────────────────────────────────────────┘
```

### After (Option B - logo pill)
```text
┌────────────────────────────────────────┐
│  [BACK]                          [●●]  │
│    ↑                              ↑    │
│  pill                        logo pill │
└────────────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/CindaChatButton.tsx` | Change button shape from circle to pill, update styling to match Back button |
| `src/pages/ProfileBuilderStep4.tsx` | Remove center positioning, remove spacer, let button align right |
| `src/pages/Recommendations.tsx` | Group Cinda + Profile buttons in a right-aligned container |
| Any other pages using CindaChatButton | Update header layout if needed |

---

## Tooltip Adjustment

The tooltip currently spawns from the bottom-right of the button. With the button now on the right edge, we may need to adjust:
- Keep `right-0` alignment (arrow still points to button)
- Or shift to `right-0` with a slight offset if it clips the edge

---

## Question for You

Which option do you prefer?
- **Option A**: Pill with "CINDA" text label (matches Back button exactly)
- **Option B**: Pill shape but logo-only (cleaner, less text)
