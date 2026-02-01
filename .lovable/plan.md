

# Persistent "Chat with Cinda" Button Across Onboarding

## Overview

Add a persistent Cinda logo button in the header (center, between BACK and CONTINUE/SKIP) that appears **after the user leaves Step 3b**. This button opens a slide-out sheet allowing users to chat with Cinda at any point in the remaining flow to add/update information.

When the user confirms leaving Step 3b (via the popup), an animation draws attention to the new chat button, teaching users it's available throughout the rest of the flow.

## User Experience Flow

1. User is on Step 3b (Chat with Cinda)
2. User clicks SKIP or CONTINUE → confirmation modal appears
3. User confirms → animation pulses/highlights the Cinda logo button in header
4. User navigates to Step 4, 4a, 4b, etc.
5. At any point, user can tap the Cinda logo → sheet slides up from bottom
6. User chats, adds info → sheet closes
7. Any extracted context updates the profile (may influence current page)

## Technical Architecture

### New Components

**1. `src/components/CindaChatSheet.tsx`** - The slide-out chat panel
- Uses the existing `Sheet` component (from `src/components/ui/sheet.tsx`)
- Slides up from bottom on mobile, contains the chat interface
- Reuses chat logic from Step 3b (messages, input, API calls)
- Syncs with ProfileContext for chat history and extracted context

**2. `src/components/CindaChatButton.tsx`** - The header button
- Displays Cinda logo (grey) as a circular button
- Positioned center in header between BACK and navigation buttons
- Shows pulse/glow animation when first revealed
- Controls the Sheet open state

### State Management

**Add to ProfileContext:**
- `showCindaChatButton: boolean` - Whether the chat button should appear globally
- `setShowCindaChatButton: (show: boolean) => void` - Function to show the button

The button appears after Step 3b confirmation and persists through Steps 4, 4a, 4b, 4-analysis, and Recommendations.

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/CindaChatSheet.tsx` | Slide-out chat panel with full chat interface |
| `src/components/CindaChatButton.tsx` | Logo button with reveal animation |

### Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/ProfileContext.tsx` | Add `showCindaChatButton` state and setter |
| `src/pages/ProfileBuilderStep3b.tsx` | Set `showCindaChatButton(true)` when user confirms leave |
| `src/pages/ProfileBuilderStep4.tsx` | Add CindaChatButton to header (center) |
| `src/pages/ProfileBuilderStep4a.tsx` | Add CindaChatButton to header |
| `src/pages/ProfileBuilderStep4b.tsx` | Add CindaChatButton to header |
| `src/pages/ProfileBuilderStep4Analysis.tsx` | Add CindaChatButton to header |
| `src/pages/Recommendations.tsx` | Add CindaChatButton to header |

### UI Details

**Header Layout (Steps 4+):**
```
┌────────────────────────────────────────┐
│  [BACK]        [Cinda]       [NEXT]    │
└────────────────────────────────────────┘
```

**Cinda Button Styling:**
- Circular button (w-9 h-9)
- Contains Cinda logo (cinda-logo-grey.png)
- Semi-transparent background matching other header buttons
- Border matching existing style (`border-card-foreground/20`)

**Reveal Animation:**
- When first shown after Step 3b, add a pulse/glow effect
- Use CSS animation: scale + glow ring that fades out after ~2 seconds
- Animation plays once on mount if it's the first reveal

**Sheet Design:**
- Slides from bottom (mobile-first)
- Height: ~70% of viewport
- Contains:
  - Header with "Chat with Cinda" title + close X
  - Messages area (same as Step 3b)
  - Input area (same as Step 3b)
- Matches existing card styling (bg-card, border-border/20)

### Chat Sheet Behavior

1. Opens via Sheet component (side="bottom")
2. Shows existing chat history from ProfileContext
3. User can send new messages
4. API calls go to `/api/chat` (same as Step 3b)
5. Extracted context merges into ProfileContext
6. When closed, chat history is persisted
7. If user is on a page that displays data affected by chat context (e.g., archetype selection), the page may update reactively

### Animation Keyframes (for reveal)

```css
@keyframes cinda-reveal {
  0% { 
    transform: scale(0.8); 
    opacity: 0; 
  }
  50% { 
    transform: scale(1.1); 
    box-shadow: 0 0 20px rgba(148,163,184,0.4); 
  }
  100% { 
    transform: scale(1); 
    opacity: 1;
    box-shadow: 0 0 0 transparent; 
  }
}
```

## Technical Implementation Notes

**Reusing Step 3b Logic:**
- Extract shared chat logic (message handling, API calls, typing state) 
- Both Step 3b and CindaChatSheet will use the same `profileData.step3.chatHistory`
- Both call `updateChatHistory` and `updateChatContext` from ProfileContext

**Sheet Configuration:**
```tsx
<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent 
    side="bottom" 
    className="h-[70vh] rounded-t-2xl"
  >
    {/* Chat interface */}
  </SheetContent>
</Sheet>
```

**Button Reveal Flow:**
1. In Step 3b `handleConfirmLeave`: `setShowCindaChatButton(true)`
2. Navigate to Step 4
3. Step 4 header renders `<CindaChatButton />` which checks `showCindaChatButton`
4. If true, renders button with one-time animation

