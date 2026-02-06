

# Add Plate Preference to Quick Match and Full Analysis Forms

## Overview

Add a new "Plate Preference" control to both the Quick Match and ProfileBuilderStep4b forms. This lets users specify whether they want plated shoes, non-plated shoes, or specific plate materials.

## Design Pattern

Following the exact same pattern as the existing `HeelDropPreferenceCard`:
- Two-button toggle for mode selection ("Let Cinda decide" / "I have a preference")
- Multi-select buttons that appear when "I have a preference" is selected
- Same visual style, spacing, and interaction patterns

## Placement

| Form | Location |
|------|----------|
| **Quick Match** | After Heel Drop, before Brand Preference (around line 676) |
| **ProfileBuilderStep4b** | After Heel Drop, before Brand Preference (around line 840) |

## UI Components

### Label & Help Text
- **Label**: "Plate preference"
- **Tooltip**: "Plates add structure and energy return, but some runners prefer a more natural feel"

### Multi-Select Options
When "I have a preference" is selected, show these buttons:

| Option | Value | Behavior |
|--------|-------|----------|
| No plate | `"none"` | Mutually exclusive - deselects all others when clicked |
| Any plate | `"any"` | Can combine with specific plate materials |
| Nylon plate | `"nylon"` | Can combine with other plate types |
| Pebax plate | `"pebax"` | Can combine with other plate types |
| Carbon plate | `"carbon"` | Can combine with other plate types |

### Mutual Exclusion Logic
- Selecting "No plate" clears all other selections
- Selecting any plate option clears "No plate" if it was selected

---

## Technical Implementation

### 1. Type Definitions

**File: `src/contexts/ProfileContext.tsx`**

Add new types:

```typescript
export type PlateOption = "none" | "any" | "nylon" | "pebax" | "carbon";

export interface PlatePreference {
  mode: PreferenceMode;
  values?: PlateOption[];  // Only set when mode === "user_set"
}
```

Update `FeelPreferences` interface to include plate preference:

```typescript
export interface FeelPreferences {
  cushionAmount: SliderPreference;
  stabilityAmount: SliderPreference;
  energyReturn: SliderPreference;
  stackHeight: SliderPreference;
  rocker: SliderPreference;
  heelDropPreference: HeelDropPreference;
  platePreference: PlatePreference;       // NEW
  brandPreference: BrandPreference;
}
```

### 2. Quick Match Form

**File: `src/pages/QuickMatch.tsx`**

**Add plate options constant:**
```typescript
const PLATE_OPTIONS: { value: PlateOption; label: string }[] = [
  { value: "none", label: "No plate" },
  { value: "any", label: "Any plate" },
  { value: "nylon", label: "Nylon plate" },
  { value: "pebax", label: "Pebax plate" },
  { value: "carbon", label: "Carbon plate" },
];
```

**Add PlatePreferenceCard component** (follows HeelDropPreferenceCard pattern):
- Mode selector toggle
- Multi-select buttons with mutual exclusion logic for "none"
- Same styling as heel drop card

**Update state interface** to include `platePreference` in `feelPreferences`

**Update form layout** to render PlatePreferenceCard between HeelDropPreferenceCard and BrandPreferenceCard

### 3. ProfileBuilderStep4b Form

**File: `src/pages/ProfileBuilderStep4b.tsx`**

Same changes as QuickMatch:
- Add PLATE_OPTIONS constant
- Add PlatePreferenceCard component
- Update form layout to include the new card after HeelDropPreferenceCard

### 4. Default Values

**File: `src/pages/ProfileBuilderStep4b.tsx`**

Update `getDefaultPreferences()`:
```typescript
const getDefaultPreferences = (): FeelPreferences => ({
  // ... existing preferences
  heelDropPreference: { mode: "cinda_decides" },
  platePreference: { mode: "cinda_decides" },     // NEW
  brandPreference: { mode: "all", brands: [] },
});
```

**File: `src/pages/QuickMatch.tsx`**

Update initial state to include `platePreference: { mode: "cinda_decides" }`

---

## Component Structure

### PlatePreferenceCard

```tsx
const PlatePreferenceCard = ({
  preference,
  onChange,
}: {
  preference: PlatePreference;
  onChange: (pref: PlatePreference) => void;
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

  const handleOptionChange = (option: PlateOption) => {
    let newValues: PlateOption[];
    
    if (option === "none") {
      // "No plate" is mutually exclusive
      newValues = selectedValues.includes("none") ? [] : ["none"];
    } else {
      // Remove "none" if selecting any plate option
      const filteredValues = selectedValues.filter((v) => v !== "none");
      newValues = filteredValues.includes(option)
        ? filteredValues.filter((v) => v !== option)
        : [...filteredValues, option];
    }
    
    onChange({ mode: "user_set", values: newValues });
  };

  return (
    <div className="p-4 rounded-lg bg-card-foreground/[0.02] border border-card-foreground/10">
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-sm text-card-foreground/90">Plate preference</span>
        <AdaptiveTooltip content="Plates add structure and energy return, but some runners prefer a more natural feel" />
      </div>

      <ModeSelector mode={preference.mode} onChange={handleModeChange} />

      {showCheckboxes && (
        <div className="mt-3">
          <p className="text-xs text-card-foreground/40 mb-2">Select all that apply</p>
          <div className="flex flex-wrap gap-2">
            {PLATE_OPTIONS.map((option) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleOptionChange(option.value)}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-md border transition-all flex items-center gap-1.5",
                    isSelected
                      ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                      : "bg-card-foreground/5 text-card-foreground/50 border-card-foreground/20 hover:text-card-foreground/70 hover:border-card-foreground/30"
                  )}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/ProfileContext.tsx` | Add `PlateOption` type, `PlatePreference` interface, update `FeelPreferences` |
| `src/pages/QuickMatch.tsx` | Add PLATE_OPTIONS, PlatePreferenceCard component, update state and form layout |
| `src/pages/ProfileBuilderStep4b.tsx` | Add PLATE_OPTIONS, PlatePreferenceCard component, update getDefaultPreferences and form layout |

---

## Data Flow

When the user completes the form:

1. `platePreference` is included in the `feelPreferences` object within `ShoeRequest`
2. Saved to localStorage via `saveShoeRequests()`
3. Available to the API for filtering recommendations based on plate preferences

The API can then filter shoes based on:
- `has_plate: boolean` - for "No plate" or "Any plate" filtering
- `plate_material: PlateMaterial` - for specific material filtering (carbon, pebax, nylon)

