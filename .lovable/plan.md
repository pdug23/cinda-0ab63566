
# Show Container on Analysis Results Page

## Overview

The analysis page currently uses the `invisible` prop on OnboardingLayout for all states, which hides the card container. You want the container to remain hidden during the loading phase but appear once results are ready.

## Solution

Make the `invisible` prop dynamic based on the loading status. This is a simple one-line change.

## Changes

### File: `src/pages/ProfileBuilderStep4Analysis.tsx`

**Update line 615:**

Change from:
```tsx
<OnboardingLayout scrollable invisible>
```

To:
```tsx
<OnboardingLayout scrollable invisible={status === "loading"}>
```

## How it works

| Status | `invisible` prop | Container visible? |
|--------|------------------|-------------------|
| `loading` | `true` | No - just the spinning logo floats on the animated background |
| `success` | `false` | Yes - content appears inside the styled card |
| `no_gap` | `false` | Yes - content appears inside the styled card |
| `error` | `false` | Yes - error content appears inside the styled card |

## Visual effect

- **During loading**: The Cinda logo spins freely on the animated background with no container (current behavior preserved)
- **After loading completes**: The familiar dark card container fades in with the recommendation content inside it

The `transition-all duration-300 ease-out` class already on the container will provide a smooth transition when the container becomes visible.

## Files to edit

| File | Change |
|------|--------|
| `src/pages/ProfileBuilderStep4Analysis.tsx` | Make `invisible` prop conditional on `status === "loading"` |
