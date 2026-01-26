
## Plan: Fix feelGap/contrastWith Pass-through and Build Error

### Problem Summary

Two issues need to be addressed:

1. **Build Error**: The `ScoredShoe` interface requires a `contrastScore` field in the breakdown, but one code path in `recommendationEngine.ts` creates a breakdown object without it.

2. **Smart Recommendations Broken**: The backend builds `feelGap` and `contrastWith` during rotation analysis to enable smart variety recommendations, but the frontend ignores these fields and never passes them through to the final discovery API call.

---

### Current Data Flow (Broken)

```text
Step 4 Analysis → API gap_detection → Returns:
                   analysis.recommendations.primary.feelGap ✓
                   analysis.recommendations.primary.contrastWith ✓

                   Frontend extracts only:
                   ├── archetype ✓
                   └── reason ✓
                   (feelGap and contrastWith ignored) ✗

Step 4b → Builds ShoeRequest with:
          ├── archetype ✓
          └── feelPreferences ✓
          (no feelGap/contrastWith) ✗

Recommendations → API discovery → Receives:
                  shoeRequests without feelGap/contrastWith ✗
                  Smart variety recommendations disabled ✗
```

### Fixed Data Flow

```text
Step 4 Analysis → API gap_detection → Returns:
                   analysis.recommendations.primary.feelGap ✓
                   analysis.recommendations.primary.contrastWith ✓

                   Frontend extracts ALL:
                   ├── archetype ✓
                   ├── reason ✓
                   ├── feelGap ✓
                   └── contrastWith ✓

                   Stored in ProfileContext step4.analysisRecommendations

Step 4b → Builds ShoeRequest with:
          ├── archetype ✓
          ├── feelPreferences ✓
          ├── feelGap ✓ (from stored analysis)
          └── contrastWith ✓ (from stored analysis)

Recommendations → API discovery → Receives full shoeRequests ✓
                  Smart variety recommendations enabled ✓
```

---

### Changes Required

#### 1. Fix Build Error in `api/lib/recommendationEngine.ts`

**Location**: Lines 618-633

**Issue**: The breakdown object is missing the `contrastScore` field that's required by the `ScoredShoe` interface.

**Fix**: Add `contrastScore: 0` to the breakdown object:

```typescript
breakdown: {
  archetypeScore: 50,
  feelScore: 0,
  heelDropScore: 0,
  stabilityBonus: 0,
  availabilityBonus: 0,
  footStrikeScore: 0,
  experienceScore: 0,
  primaryGoalScore: scoreForGapFit(shoe, gap, profile),
  runningPatternScore: 0,
  paceBucketScore: 0,
  bmiScore: 0,
  trailScore: 0,
  loveDislikeScore: 0,
  chatContextScore: 0,
  contrastScore: 0,  // ADD THIS LINE
}
```

---

#### 2. Update `ShoeRequest` Type in `ProfileContext.tsx`

**Location**: Lines 87-90

**Current**:
```typescript
export interface ShoeRequest {
  archetype: DiscoveryArchetype;
  feelPreferences: FeelPreferences;
}
```

**Updated**:
```typescript
// Feel gap from rotation analysis
export interface FeelGapInfo {
  dimension: 'cushion' | 'drop' | 'rocker' | 'stability';
  suggestion: 'low' | 'high';
  targetValue?: number;
}

// Contrast profile for variety recommendations
export interface ContrastProfile {
  cushion?: number;
  stability?: number;
  bounce?: number;
  rocker?: number;
  groundFeel?: number;
}

export interface ShoeRequest {
  archetype: DiscoveryArchetype;
  feelPreferences: FeelPreferences;
  feelGap?: FeelGapInfo;
  contrastWith?: ContrastProfile;
}
```

---

#### 3. Store Analysis Recommendations in Step4Data

**Location**: `ProfileContext.tsx` - `Step4Data` interface

**Update Step4Data** to include the full recommendation slots:

```typescript
// Full recommendation slot from analysis
export interface AnalysisRecommendation {
  archetype: string;
  reason: string;
  feelGap?: FeelGapInfo;
  contrastWith?: ContrastProfile;
}

export interface Step4Data {
  mode: "discovery" | "analysis" | null;
  selectedArchetypes: DiscoveryArchetype[];
  currentArchetypeIndex: number;
  shoeRequests: ShoeRequest[];
  gap: GapData | null;
  analysisRecommendations?: {
    primary: AnalysisRecommendation;
    secondary?: AnalysisRecommendation;
  };
}
```

---

#### 4. Update `ProfileBuilderStep4Analysis.tsx` to Store Full Recommendations

**Location**: Lines 36-43 and 188-200

**Update AnalysisData interface** to include feelGap and contrastWith:

```typescript
interface AnalysisData {
  rotationSummary: {
    prose: string;
    strengths: string[];
    improvements: string[];
  };
  recommendations: {
    tier: 1 | 2 | 3;
    confidence: "high" | "medium" | "soft";
    primary: { 
      archetype: string; 
      reason: string;
      feelGap?: FeelGapInfo;
      contrastWith?: ContrastProfile;
    };
    secondary?: { 
      archetype: string; 
      reason: string;
      feelGap?: FeelGapInfo;
      contrastWith?: ContrastProfile;
    };
  };
  health: Record<string, number>;
}
```

**Update `analyzeRotation` success handler** to store full recommendation data:

```typescript
if (analysisData) {
  setAnalysis(analysisData);
  // Pre-select all recommendations
  const archetypes = [analysisData.recommendations.primary.archetype];
  if (analysisData.recommendations.secondary) {
    archetypes.push(analysisData.recommendations.secondary.archetype);
  }
  setSelectedArchetypes(archetypes);
  
  // Store full recommendations including feelGap/contrastWith
  updateStep4({
    analysisRecommendations: {
      primary: analysisData.recommendations.primary,
      secondary: analysisData.recommendations.secondary,
    }
  });
  
  // Also set gap for backwards compat
  if (detectedGap) {
    setGap(detectedGap);
    updateStep4({ gap: detectedGap });
    saveGap(detectedGap);
  }
  setStatus("success");
}
```

---

#### 5. Update `ProfileBuilderStep4b.tsx` to Include feelGap/contrastWith

**Location**: Lines 650-662 (handleNext function)

**When building the ShoeRequest**, look up the feelGap and contrastWith from the stored analysis recommendations:

```typescript
const handleNext = () => {
  if (!isValid()) return;

  // Get feelGap and contrastWith from stored analysis recommendations
  const analysisRecs = profileData.step4.analysisRecommendations;
  let feelGap: FeelGapInfo | undefined;
  let contrastWith: ContrastProfile | undefined;
  
  if (analysisRecs) {
    if (analysisRecs.primary.archetype === currentArchetype) {
      feelGap = analysisRecs.primary.feelGap;
      contrastWith = analysisRecs.primary.contrastWith;
    } else if (analysisRecs.secondary?.archetype === currentArchetype) {
      feelGap = analysisRecs.secondary.feelGap;
      contrastWith = analysisRecs.secondary.contrastWith;
    }
  }

  const newRequest: ShoeRequest = { 
    archetype: currentArchetype, 
    feelPreferences: preferences,
    feelGap,
    contrastWith,
  };
  
  // ... rest of the function
};
```

---

#### 6. Update Storage Functions

**Location**: `src/utils/storage.ts` - `saveShoeRequests` and `loadShoeRequests`

The storage functions use generic JSON serialization, so they should automatically preserve the new `feelGap` and `contrastWith` fields. No changes needed here, but verify the `ShoeRequest` import is updated.

---

### Files to Modify

| File | Changes |
|------|---------|
| `api/lib/recommendationEngine.ts` | Add `contrastScore: 0` to breakdown (line 633) |
| `src/contexts/ProfileContext.tsx` | Add `FeelGapInfo`, `ContrastProfile`, and `AnalysisRecommendation` interfaces; update `ShoeRequest` and `Step4Data` |
| `src/pages/ProfileBuilderStep4Analysis.tsx` | Update `AnalysisData` interface; store full recommendations in `updateStep4` |
| `src/pages/ProfileBuilderStep4b.tsx` | Import new types; update `handleNext` to include feelGap/contrastWith |

---

### Testing Verification

After implementation, verify by:

1. Add a shoe (e.g., HOKA Clifton 10)
2. Complete rotation analysis (Step 4)
3. Observe the API response includes `feelGap` and `contrastWith` in the recommendations
4. Select the recommended archetype and proceed to Step 4b
5. Choose "Let Cinda decide" for all preferences
6. Check the network tab on /recommendations - the discovery request should include `feelGap` and `contrastWith` in each `shoeRequest`

---

### Expected API Request (After Fix)

```json
{
  "mode": "discovery",
  "profile": { ... },
  "currentShoes": [ ... ],
  "shoeRequests": [
    {
      "archetype": "daily_trainer",
      "feelPreferences": { ... },
      "feelGap": { 
        "dimension": "cushion", 
        "suggestion": "high", 
        "targetValue": 5 
      },
      "contrastWith": { 
        "cushion": 3.5, 
        "bounce": 2.8, 
        "rocker": 2.0, 
        "stability": 2.5 
      }
    }
  ]
}
```

This enables the recommendation engine to use the `contrastWith` profile to favor shoes that are different from the user's current rotation, implementing the "smart variety" feature.
