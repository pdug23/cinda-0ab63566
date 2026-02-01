

# Add Onboarding Tooltip to Cinda Chat Button

## Overview

Add a dismissible text bubble that appears next to the Cinda logo button when it first reveals (after leaving Step 3b). The tooltip explains the button's purpose and can be closed via an X button.

## User Experience

1. User confirms leaving Step 3b → navigates to Step 4
2. Cinda button appears with its existing reveal animation
3. A small text bubble appears beside the button (after animation completes)
4. Bubble shows explanatory text like "Need to add anything? I'm here whenever you need me"
5. User clicks X on the bubble → it dismisses and never shows again
6. If user clicks the Cinda button itself, the bubble also dismisses

## Technical Approach

### State Management

Add a new state to `ProfileContext`:
- `cindaTooltipDismissed: boolean` — tracks if user has dismissed the tooltip
- `setCindaTooltipDismissed: (dismissed: boolean) => void`

### UI Implementation

Modify `CindaChatButton.tsx` to include a tooltip bubble:

```text
Layout:
┌─────────────────────────────────────────────┐
│                                             │
│     [Bubble with text and X] ← [Cinda]      │
│                                             │
└─────────────────────────────────────────────┘
```

**Bubble Styling:**
- Positioned to the left of the button on mobile (since button is centered)
- Uses absolute positioning relative to a wrapper
- Matches existing card styling (dark background, subtle border)
- Contains the explanatory text + small X close button
- Has a subtle entrance animation (fade-in + slide) that starts after the button's reveal animation completes

**Tooltip Text Options:**
- "Need to add anything? I'm here whenever you need me"
- "You can chat with me anytime during the flow"

### Dismissal Logic

The tooltip is dismissed (and never shown again) when:
1. User clicks the X button on the tooltip
2. User clicks the Cinda button itself (which already sets `cindaChatButtonAnimated`)

Since we're tracking this with `cindaTooltipDismissed`, even if the animation has played, we can control whether to show the tooltip independently.

### Animation Timing

1. Button starts with `cinda-reveal` animation (0.6s)
2. After animation completes (~600ms), tooltip fades in with a slight delay
3. Use CSS animation-delay or a short setTimeout to sequence the entrance

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/ProfileContext.tsx` | Add `cindaTooltipDismissed` state and setter |
| `src/components/CindaChatButton.tsx` | Add tooltip bubble UI with dismiss logic |
| `tailwind.config.ts` | Add `tooltip-fade-in` animation keyframes |

## Component Structure

```tsx
// CindaChatButton.tsx structure
<div className="relative flex items-center">
  {/* Tooltip bubble - only show when button visible, not dismissed, and not animated yet */}
  {showCindaChatButton && !cindaTooltipDismissed && !cindaChatButtonAnimated && (
    <div className="absolute right-full mr-3 animate-tooltip-fade-in ...">
      <p>Need to add anything? I'm here whenever you need me</p>
      <button onClick={handleDismissTooltip}>
        <X className="w-3 h-3" />
      </button>
      {/* Small arrow pointing to button */}
      <div className="absolute right-0 translate-x-full ... triangle" />
    </div>
  )}
  
  {/* Existing button */}
  <button onClick={handleClick} ...>
    <img src={cindaLogoGrey} ... />
  </button>
</div>
```

## Tooltip Styling Details

- **Background**: `bg-card` with subtle border matching existing design
- **Text**: Small text (text-xs or text-sm), muted color
- **Arrow**: CSS triangle pointing right toward the button
- **Close button**: Small X icon in top-right corner of bubble
- **Max width**: ~180-200px to keep it compact
- **Animation**: Fade in + slight translate from left, starts with delay

