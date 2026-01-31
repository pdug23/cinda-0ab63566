

# Add Stack Height Slider to Full Analysis and Quick Match

## Overview

Add a new "Stack Height" preference slider to both the Full Analysis (ProfileBuilderStep4b) and Quick Match flows, positioned after "Rocker" and before "Heel drop". The backend already supports `stackHeight` (as shown in the last-diff), so this is a frontend-only change.

## Current State

**Backend (already complete):**
- `api/types.ts` already has `stackHeight: PreferenceValue` in `NormalizedFeelPreferences`
- `api/lib/shoeRetrieval.ts` already handles stack height scoring (inverse of ground feel)
- `api/analyze.ts` already normalizes `stackHeight` in the API payload

**Frontend (needs update):**
- `ProfileBuilderStep4b.tsx` has 4 sliders in `SLIDERS` array: cushionAmount, stabilityAmount, energyReturn, rocker
- `QuickMatch.tsx` mirrors the same pattern with identical `SLIDERS` config
- `ProfileContext.tsx` `FeelPreferences` interface only has 4 slider preferences + heelDropPreference + brandPreference

## Technical Changes

### 1. Update ProfileContext.tsx

**Add stackHeight to FeelPreferences interface (lines 78-85):**

```typescript
export interface FeelPreferences {
  cushionAmount: SliderPreference;
  stabilityAmount: SliderPreference;
  energyReturn: SliderPreference;
  stackHeight: SliderPreference;  // NEW - after energyReturn, before rocker
  rocker: SliderPreference;
  heelDropPreference: HeelDropPreference;
  brandPreference: BrandPreference;
}
```

### 2. Update ProfileBuilderStep4b.tsx

**Update SliderConfig key type (line 159):**
```typescript
interface SliderConfig {
  key: "cushionAmount" | "stabilityAmount" | "energyReturn" | "stackHeight" | "rocker";
  // ... rest unchanged
}
```

**Add Stack Height to SLIDERS array (after energyReturn, before rocker - around line 191):**
```typescript
const SLIDERS: SliderConfig[] = [
  // ... cushionAmount, stabilityAmount, energyReturn unchanged
  {
    key: "stackHeight",
    label: "Stack height",
    tooltip: "Low stack shoes feel closer to the ground (minimalist). High stack shoes provide maximum cushioning and isolation.",
    leftLabel: "Grounded",
    middleLabel: "Moderate",
    rightLabel: "Max Stack",
  },
  // ... rocker unchanged
];
```

**Update getDefaultPreferences function (lines 534-541):**
```typescript
const getDefaultPreferences = (): FeelPreferences => ({
  cushionAmount: { mode: "cinda_decides" },
  stabilityAmount: { mode: "cinda_decides" },
  energyReturn: { mode: "cinda_decides" },
  stackHeight: { mode: "cinda_decides" },  // NEW
  rocker: { mode: "cinda_decides" },
  heelDropPreference: { mode: "cinda_decides" },
  brandPreference: { mode: "all", brands: [] },
});
```

### 3. Update QuickMatch.tsx

**Update SliderConfig key type (line 154):**
```typescript
interface SliderConfig {
  key: "cushionAmount" | "stabilityAmount" | "energyReturn" | "stackHeight" | "rocker";
  // ... rest unchanged
}
```

**Add Stack Height to SLIDERS array (same position - after energyReturn, before rocker):**
```typescript
const SLIDERS: SliderConfig[] = [
  // ... cushionAmount, stabilityAmount, energyReturn unchanged
  {
    key: "stackHeight",
    label: "Stack height",
    tooltip: "Low stack shoes feel closer to the ground (minimalist). High stack shoes provide maximum cushioning and isolation.",
    leftLabel: "Grounded",
    middleLabel: "Moderate",
    rightLabel: "Max Stack",
  },
  // ... rocker unchanged
];
```

**Update QuickMatchState interface (lines 508-518):**
```typescript
interface QuickMatchState {
  selectedArchetype: DiscoveryArchetype | null;
  feelPreferences: {
    cushionAmount: SliderPreference;
    stabilityAmount: SliderPreference;
    energyReturn: SliderPreference;
    stackHeight: SliderPreference;  // NEW
    rocker: SliderPreference;
    heelDropPreference: HeelDropPreference;
  };
  brandPreference: BrandPreference;
}
```

**Update initial state (lines 524-534):**
```typescript
const [state, setState] = useState<QuickMatchState>({
  selectedArchetype: null,
  feelPreferences: {
    cushionAmount: { mode: "cinda_decides" },
    stabilityAmount: { mode: "cinda_decides" },
    energyReturn: { mode: "cinda_decides" },
    stackHeight: { mode: "cinda_decides" },  // NEW
    rocker: { mode: "cinda_decides" },
    heelDropPreference: { mode: "cinda_decides" },
  },
  brandPreference: { mode: "all", brands: [] },
});
```

**Update handleSubmit feelPreferences construction (lines 565-572):**
```typescript
const feelPreferences: FeelPreferences = {
  cushionAmount: state.feelPreferences.cushionAmount,
  stabilityAmount: state.feelPreferences.stabilityAmount,
  energyReturn: state.feelPreferences.energyReturn,
  stackHeight: state.feelPreferences.stackHeight,  // NEW
  rocker: state.feelPreferences.rocker,
  heelDropPreference: state.feelPreferences.heelDropPreference,
  brandPreference: state.brandPreference,
};
```

## Final Slider Order (both flows)

1. Cushion amount
2. Stability amount
3. Energy return
4. **Stack height** (new)
5. Rocker
6. Heel drop
7. Brand preference

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/ProfileContext.tsx` | Add `stackHeight: SliderPreference` to FeelPreferences interface |
| `src/pages/ProfileBuilderStep4b.tsx` | Update SliderConfig type, add stackHeight to SLIDERS array, update getDefaultPreferences |
| `src/pages/QuickMatch.tsx` | Update SliderConfig type, add stackHeight to SLIDERS array, update QuickMatchState and initial state |

## Testing

After implementation:
- Navigate to /quick-match and verify Stack Height slider appears between Energy Return and Rocker
- Navigate to /profile/step4b (through full analysis flow) and verify same placement
- Test "Let Cinda decide" mode (slider hidden)
- Test "I have a preference" mode (slider visible, adjustable 1-5)
- Verify the tooltip displays correctly on both mobile and desktop

