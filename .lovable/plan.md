
# Add "Let Cinda Decide" Mode to Quick Match Feel Preferences

## Overview

Replace Quick Match's hardcoded feel preference sliders with the same mode-aware preference cards used in Full Analysis (ProfileBuilderStep4b), but simplified to only two options: "Let Cinda decide" and "I have a preference" (no "wildcard" / "I don't mind").

## Current State

**Quick Match (QuickMatch.tsx):**
- Uses raw sliders that are always visible (lines 471-524)
- State stores raw slider values: `sliders: { cushionAmount: 3, ... }` (lines 327-333)
- On submit, **always** sends `mode: "user_set"` (lines 387-394)
- Heel drop uses simple checkbox array without mode selector (lines 526-554)

**Full Analysis (ProfileBuilderStep4b.tsx):**
- Has `ModeSelector` component with 3 options (lines 204-237)
- Has `SliderPreferenceCard` that shows slider only when `mode === "user_set"` (lines 240-326)
- Has `HeelDropPreferenceCard` with same pattern (lines 329-394)
- State uses `SliderPreference` and `HeelDropPreference` types from ProfileContext

## Changes Required

### 1. Update State Structure

**Before (lines 324-335):**
```typescript
interface QuickMatchState {
  selectedArchetype: DiscoveryArchetype | null;
  sliders: {
    cushionAmount: FeelValue;
    stabilityAmount: FeelValue;
    energyReturn: FeelValue;
    rocker: FeelValue;
  };
  heelDropValues: HeelDropOption[];
  brandPreference: BrandPreference;
}
```

**After:**
```typescript
interface QuickMatchState {
  selectedArchetype: DiscoveryArchetype | null;
  feelPreferences: {
    cushionAmount: SliderPreference;
    stabilityAmount: SliderPreference;
    energyReturn: SliderPreference;
    rocker: SliderPreference;
    heelDropPreference: HeelDropPreference;
  };
  brandPreference: BrandPreference;
}
```

### 2. Update Initial State

**Before (lines 340-350):**
```typescript
const [state, setState] = useState<QuickMatchState>({
  selectedArchetype: null,
  sliders: {
    cushionAmount: 3,
    stabilityAmount: 3,
    energyReturn: 3,
    rocker: 3,
  },
  heelDropValues: [],
  brandPreference: { mode: "all", brands: [] },
});
```

**After:**
```typescript
const [state, setState] = useState<QuickMatchState>({
  selectedArchetype: null,
  feelPreferences: {
    cushionAmount: { mode: "cinda_decides" },
    stabilityAmount: { mode: "cinda_decides" },
    energyReturn: { mode: "cinda_decides" },
    rocker: { mode: "cinda_decides" },
    heelDropPreference: { mode: "cinda_decides" },
  },
  brandPreference: { mode: "all", brands: [] },
});
```

### 3. Add Two-Option ModeSelector Component

Copy from ProfileBuilderStep4b but remove "wildcard" option:

```typescript
const ModeSelector = ({
  mode,
  onChange,
}: {
  mode: PreferenceMode;
  onChange: (mode: PreferenceMode) => void;
}) => {
  const modes: { value: PreferenceMode; label: string }[] = [
    { value: "cinda_decides", label: "Let Cinda decide" },
    { value: "user_set", label: "I have a preference" },
    // No "wildcard" option for Quick Match
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {modes.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => onChange(m.value)}
          className={cn(
            "px-3 py-1.5 text-xs rounded-md border transition-all",
            mode === m.value
              ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
              : "bg-card-foreground/5 text-card-foreground/50 border-card-foreground/20 hover:text-card-foreground/70 hover:border-card-foreground/30"
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
};
```

### 4. Add SliderPreferenceCard Component

Copy from ProfileBuilderStep4b (lines 240-326):

```typescript
const SliderPreferenceCard = ({
  config,
  preference,
  onChange,
}: {
  config: SliderConfig;
  preference: SliderPreference;
  onChange: (pref: SliderPreference) => void;
}) => {
  const showSlider = preference.mode === "user_set";
  const sliderValue = preference.value ?? 3;

  const handleModeChange = (mode: PreferenceMode) => {
    if (mode === "user_set") {
      onChange({ mode, value: preference.value ?? 3 });
    } else {
      onChange({ mode });
    }
  };

  const handleSliderChange = (value: FeelValue) => {
    onChange({ mode: "user_set", value });
  };

  return (
    // ... full implementation from ProfileBuilderStep4b
  );
};
```

### 5. Add HeelDropPreferenceCard Component

Copy from ProfileBuilderStep4b (lines 329-394):

```typescript
const HeelDropPreferenceCard = ({
  preference,
  onChange,
}: {
  preference: HeelDropPreference;
  onChange: (pref: HeelDropPreference) => void;
}) => {
  const showCheckboxes = preference.mode === "user_set";
  const selectedValues = preference.values ?? [];

  const handleModeChange = (mode: PreferenceMode) => {
    if (mode === "user_set") {
      onChange({ mode, values: preference.values ?? [] });
    } else {
      onChange({ mode });
    }
  };

  // ... rest of implementation
};
```

### 6. Update Handler Functions

**Remove:**
- `handleSliderChange` (lines 363-368)
- `handleHeelDropToggle` (lines 370-377)

**Add:**
```typescript
const handleFeelPreferenceChange = (
  key: keyof QuickMatchState["feelPreferences"],
  pref: SliderPreference | HeelDropPreference
) => {
  setState((prev) => ({
    ...prev,
    feelPreferences: { ...prev.feelPreferences, [key]: pref },
  }));
};
```

### 7. Update handleSubmit

**Before (lines 386-396):**
```typescript
const feelPreferences: FeelPreferences = {
  cushionAmount: { mode: "user_set", value: state.sliders.cushionAmount },
  stabilityAmount: { mode: "user_set", value: state.sliders.stabilityAmount },
  energyReturn: { mode: "user_set", value: state.sliders.energyReturn },
  rocker: { mode: "user_set", value: state.sliders.rocker },
  heelDropPreference: state.heelDropValues.length > 0
    ? { mode: "user_set", values: state.heelDropValues }
    : { mode: "cinda_decides" },
  brandPreference: state.brandPreference,
};
```

**After:**
```typescript
const feelPreferences: FeelPreferences = {
  cushionAmount: state.feelPreferences.cushionAmount,
  stabilityAmount: state.feelPreferences.stabilityAmount,
  energyReturn: state.feelPreferences.energyReturn,
  rocker: state.feelPreferences.rocker,
  heelDropPreference: state.feelPreferences.heelDropPreference,
  brandPreference: state.brandPreference,
};
```

### 8. Update UI Section

**Replace (lines 471-554):** the current always-visible sliders and heel drop checkboxes

**With:** The new preference card components:

```tsx
{/* Feel Preferences */}
<div className="space-y-4 mb-4">
  {SLIDERS.map((config) => (
    <SliderPreferenceCard
      key={config.key}
      config={config}
      preference={state.feelPreferences[config.key]}
      onChange={(pref) => handleFeelPreferenceChange(config.key, pref)}
    />
  ))}
</div>

{/* Heel Drop */}
<div className="mb-4">
  <HeelDropPreferenceCard
    preference={state.feelPreferences.heelDropPreference}
    onChange={(pref) => handleFeelPreferenceChange("heelDropPreference", pref)}
  />
</div>
```

### 9. Add Missing Imports

```typescript
import type {
  DiscoveryArchetype,
  FeelValue,
  HeelDropOption,
  BrandPreferenceMode,
  BrandPreference,
  FeelPreferences,
  ShoeRequest,
  PreferenceMode,      // NEW
  SliderPreference,    // NEW
  HeelDropPreference,  // NEW
} from "@/contexts/ProfileContext";
```

## Visual Comparison

| Current Quick Match | Updated Quick Match |
|---------------------|---------------------|
| Sliders always visible | Mode selector with slider hidden by default |
| Forces user to set values | Defaults to "Let Cinda decide" |
| Heel drop just checkboxes | Same mode selector pattern |

## API Payload Comparison

**Before (always user_set):**
```json
{
  "feelPreferences": {
    "cushionAmount": { "mode": "user_set", "value": 3 },
    "stabilityAmount": { "mode": "user_set", "value": 3 },
    "energyReturn": { "mode": "user_set", "value": 3 },
    "rocker": { "mode": "user_set", "value": 3 }
  }
}
```

**After (respects user choice):**
```json
{
  "feelPreferences": {
    "cushionAmount": { "mode": "cinda_decides" },
    "stabilityAmount": { "mode": "cinda_decides" },
    "energyReturn": { "mode": "user_set", "value": 4 },
    "rocker": { "mode": "cinda_decides" }
  }
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/QuickMatch.tsx` | Replace state structure, add 3 new components (ModeSelector, SliderPreferenceCard, HeelDropPreferenceCard), update handlers and UI |

## Complexity

Medium - significant refactoring of one file, but all patterns are copied from ProfileBuilderStep4b which is already working.
