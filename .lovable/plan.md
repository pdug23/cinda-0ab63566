

## Plan: Create /quick-match Route

### Summary

A single-page form with two sections: Archetype Selection (always visible) and Feel Preferences + Brand Picker (appears after archetype is selected). Uses local component state and routes to `/recommendations` on submit.

---

### New File

**`src/pages/QuickMatch.tsx`**

---

### Route Registration

**`src/App.tsx`** - Add route:
```tsx
import QuickMatch from "./pages/QuickMatch";
// ...
<Route path="/quick-match" element={<QuickMatch />} />
```

---

### Page Structure

```text
+------------------------------------------+
|  [BACK button - optional]                |
+------------------------------------------+
|                                          |
|  Section 1: Archetype Selection          |
|  "What type of shoe are you looking for?"|
|                                          |
|  [ Daily trainer      ]                  |
|  [ Recovery shoe      ]                  |
|  [ Workout shoe       ]                  |
|  [ Race shoe          ]                  |
|  [ Trail shoe         ]                  |
|                                          |
+------------------------------------------+
|  Section 2: Feel Preferences             |  <- Fades in after
|  (appears after archetype selected)      |     archetype selected
|                                          |
|  "How do you want your [archetype]       |
|   to feel?"                              |
|                                          |
|  Cushion amount    [----o----] Balanced  |
|  Stability amount  [----o----] Balanced  |
|  Energy return     [----o----] Balanced  |
|  Rocker            [----o----] Balanced  |
|  Heel drop         [0mm][1-4][5-8]...    |
|                                          |
|  Brand preference  [Showing all brands]  |
|                                          |
+------------------------------------------+
|                                          |
|  [  GET RECOMMENDATIONS  ]  <- disabled  |
|                         until archetype  |
+------------------------------------------+
```

---

### Technical Implementation

**1. Component State (NOT localStorage)**
```tsx
interface QuickMatchState {
  selectedArchetype: DiscoveryArchetype | null;
  feelPreferences: {
    cushionAmount: number;      // 1-5, default 3
    stabilityAmount: number;    // 1-5, default 3
    energyReturn: number;       // 1-5, default 3
    rocker: number;             // 1-5, default 3
    heelDropValues: string[];   // e.g., ["5-8mm", "9-12mm"]
  };
  brandPreference: BrandPreference;
}
```

**2. Section 1: Archetype Selector**
- Copy `ARCHETYPE_OPTIONS` from Step4a
- Copy `SelectionButton` usage pattern
- Single-select only (clicking a new option replaces the previous)
- NO "Not sure" option

**3. Section 2: Feel Preferences**
- Fades in with `animate-fade-in` when archetype is selected
- Show sliders directly (no 3-mode selector)
- All sliders default to 3 (middle)
- Reuse slider styling from Step4b
- Reuse `HeelDropPreferenceCard` pattern (checkboxes)
- Reuse `BrandPreferenceCard` component pattern

**4. Submit Button**
- Text: "GET RECOMMENDATIONS" (uppercase, matches NEXT button style)
- Disabled until archetype is selected
- Same pill-shaped styling as other pages

**5. On Submit**
- Build a minimal profile with defaults for required fields
- Save to localStorage using `saveShoeRequests()` with constructed ShoeRequest
- Clear any existing gap data with `clearGap()`
- Navigate to `/recommendations`

---

### Key Components to Reuse

From `ProfileBuilderStep4a.tsx`:
- `ARCHETYPE_OPTIONS` array
- `SelectionButton` component
- Header/layout patterns

From `ProfileBuilderStep4b.tsx`:
- `SLIDERS` config array
- Slider styling classes
- `HEEL_DROP_OPTIONS` array
- `BrandPreferenceCard` component (copy inline)
- `AdaptiveTooltip` component (copy inline)

From shared:
- `OnboardingLayout`
- `PageTransition`
- `AnimatedBackground`
- `Slider` component

---

### Data Flow on Submit

```text
1. Build ShoeRequest object:
   {
     archetype: selectedArchetype,
     feelPreferences: {
       cushionAmount: { mode: "user_set", value: state.cushionAmount },
       stabilityAmount: { mode: "user_set", value: state.stabilityAmount },
       energyReturn: { mode: "user_set", value: state.energyReturn },
       rocker: { mode: "user_set", value: state.rocker },
       heelDropPreference: { 
         mode: state.heelDropValues.length > 0 ? "user_set" : "cinda_decides",
         values: state.heelDropValues 
       },
       brandPreference: state.brandPreference
     }
   }

2. Create minimal profile for API:
   - firstName: "Quick Match"
   - experience: "intermediate" (default)
   - primaryGoal: "general_fitness" (default)

3. Save to localStorage:
   - saveProfile(minimalProfile)
   - saveShoeRequests([shoeRequest])
   - clearShoes() // No rotation data
   - clearGap() // Discovery mode

4. Navigate to /recommendations
```

---

### Styling Details

- Use `OnboardingLayout scrollable` for the container
- Header matches existing pages (no BACK button needed for this standalone flow, but can include one that goes to `/`)
- Section 2 uses `animate-fade-in` class for smooth appearance
- All spacing, padding, and touch targets match existing profile pages
- Mobile sticky footer with submit button

---

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/pages/QuickMatch.tsx` | **CREATE** - Main page component (~400 lines) |
| `src/App.tsx` | **MODIFY** - Add route (2 lines) |

