
# Fix: Consistent Shoe Card Height

## Problem
When bullet points span fewer lines, the card shrinks to fit the content. All shoe cards should maintain the same height regardless of bullet content length.

## Root Cause
The card currently uses `height: "100%"` which allows it to shrink based on content. Even though the bullet section has `flex-1` to expand and fill space, the parent card itself has no fixed height to create that space.

## Solution
Change the card from `height: 100%` to a fixed height value. This ensures all cards are identical in size, and the `flex-1` on the bullet section will create blank space when bullets are shorter.

## Implementation

**File:** `src/components/results/ShoeCard.tsx`

**Change:** Update line 245 from flexible to fixed height:

```text
Current:
  height: "100%",
  minHeight: "480px",
  maxHeight: "600px",

Change to:
  height: "520px",
```

This sets a consistent fixed height of 520px for all cards. The bullet section already has `flex-1` applied, so when bullets take up less space, the extra room will appear as blank space below the bullets (before the specs section).

## Result
- All shoe cards will be exactly 520px tall
- Cards with shorter bullets will have extra whitespace in the bullet section
- Cards with longer bullets will display normally
- Consistent, polished appearance across all recommendations
