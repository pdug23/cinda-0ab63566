

# Replace Step 3b with Auto-Opening Cinda Chat Sheet on Step 4

## Overview

Remove the dedicated Step 3b page and instead have the Cinda chat automatically pop up as a sheet (the same `CindaChatSheet` component) when the user navigates from Step 3 to Step 4. This simplifies the flow and reuses the existing sheet component.

## User Flow Change

**Current flow:**
```text
Step 3 (Rotation) → Step 3b (Chat page) → [Click Continue] → Step 4 (Mode Selection)
```

**New flow:**
```text
Step 3 (Rotation) → Step 4 (Mode Selection) + [Cinda Sheet auto-opens]
                                           → [Close Sheet] → Tooltip appears + Cinda button in header
```

## Detailed UX Sequence

1. User completes Step 3 and clicks "Next" or "Skip"
2. Navigate directly to Step 4 (skipping Step 3b entirely)
3. Step 4 loads with Cinda chat sheet automatically opening
4. Cinda's intro sequence plays inside the sheet (greeting + follow-up)
5. User can chat or close the sheet
6. When sheet closes → Cinda button appears in header with the existing reveal animation + tooltip

## Technical Implementation

### 1. Modify Step 3 Navigation

**File: `src/pages/ProfileBuilderStep3.tsx`**

Change the navigation targets:
- `handleConfirmSkip`: Change from `/profile/step3b` to `/profile/step4`
- `handleNextClick`: Change from `/profile/step3b` to `/profile/step4`

Pass a state flag to indicate the sheet should auto-open:
```tsx
navigate("/profile/step4", { state: { autoOpenChat: true } });
```

### 2. Modify Step 4 to Auto-Open Chat Sheet

**File: `src/pages/ProfileBuilderStep4.tsx`**

- Import `CindaChatSheet` component
- Import `useLocation` to read the navigation state
- Add local state for sheet open/close
- On mount, check if `location.state?.autoOpenChat` is true
  - If yes, open the sheet immediately
- When sheet closes, trigger the Cinda button reveal + tooltip

### 3. Enhance CindaChatSheet for Intro Sequence

**File: `src/components/CindaChatSheet.tsx`**

Currently, the sheet just loads existing chat history. We need to add support for the intro sequence (greeting + follow-up) when opened for the first time:

- Add intro phase logic (similar to Step 3b's `introPhase` state)
- On first open (empty chat history), show:
  1. Typing indicator → "Hey, Cinda here."
  2. Pause → Typing indicator → Follow-up question
- Disable input until intro completes

### 4. Update Back Navigation on Step 4

**File: `src/pages/ProfileBuilderStep4.tsx`**

Change `handleBack`:
- Currently navigates to `/profile/step3b`
- Change to navigate to `/profile/step3`

### 5. Handle Sheet Close → Button Reveal

**File: `src/pages/ProfileBuilderStep4.tsx`**

When the sheet closes:
1. Call `setShowCindaChatButton(true)` to show the persistent header button
2. The button will animate with its reveal animation
3. The tooltip will appear (since `cindaChatButtonAnimated` and `cindaTooltipDismissed` are still false)

### 6. Remove Step 3b Route (Optional/Later)

**File: `src/App.tsx`**

The route can be removed or kept for backward compatibility. If removed:
- Remove import for `ProfileBuilderStep3b`
- Remove the route `<Route path="/profile/step3b" ... />`

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/ProfileBuilderStep3.tsx` | Change navigation from `/profile/step3b` to `/profile/step4` with state |
| `src/pages/ProfileBuilderStep4.tsx` | Add auto-open chat logic, import sheet, handle close callback, fix back nav |
| `src/components/CindaChatSheet.tsx` | Add intro sequence logic (greeting + follow-up + typewriter) |
| `src/App.tsx` | Optionally remove Step 3b route |

## Component Flow Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│                         STEP 4 PAGE                              │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  Header: [BACK]       [Cinda Button*]         [ ]        │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  Mode Selection Cards                                    │   │
│   │  • Recommend me a shoe                                   │   │
│   │  • Check my rotation                                     │   │
│   │  • Find by shoe type                                     │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   * Button only shows AFTER sheet is closed                      │
└─────────────────────────────────────────────────────────────────┘

                              │
                              │ On mount (if autoOpenChat)
                              ▼

┌─────────────────────────────────────────────────────────────────┐
│               CINDA CHAT SHEET (70vh, slides up)                 │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  "Chat with Cinda"                              [X]      │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   [Spinning logo] → "Hey, Cinda here."                           │
│                                                                  │
│   [Pause] → [Spinning logo] →                                    │
│   "You've told me the basics, but running's personal..."        │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  [Reply...                    ] [🎤] [↑]                 │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Key Logic for CindaChatSheet Enhancement

The sheet will need to mirror the intro sequence from Step 3b:

```tsx
// CindaChatSheet.tsx - New state
const [introPhase, setIntroPhase] = useState<'idle' | 'typing1' | 'message1' | 'pause' | 'typing2' | 'message2' | 'done'>('idle');
const [selectedFollowup] = useState(() => getRandomFollowup());

// On open, check if we need intro
useEffect(() => {
  if (open && profileData.step3.chatHistory.length === 0) {
    setIntroPhase('typing1');
  }
}, [open]);

// Phase progression logic (similar to Step 3b)
useEffect(() => {
  if (introPhase === 'typing1') {
    // Show spinner, then add greeting after 1s
    timer = setTimeout(() => {
      addGreetingMessage();
      setIntroPhase('message1');
    }, 1000);
  }
  // ... etc
}, [introPhase]);
```

## Benefits

1. **Simpler flow** - One less page to navigate through
2. **Reuses existing component** - `CindaChatSheet` already works well
3. **Consistent UX** - Same sheet experience throughout the app
4. **Better continuity** - Users see Step 4 content while chatting

