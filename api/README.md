# Cinda API Documentation

## Overview

The Cinda API consists of serverless functions that analyze a runner's shoe rotation and provide personalized recommendations.

**Base URL (Development):** `http://localhost:8080/api`
**Base URL (Production):** `https://your-domain.vercel.app/api`

---

## Endpoints

### POST /api/analyze

Analyzes runner profile and current shoes to generate 3 shoe recommendations.

**Request:**
```typescript
{
  profile: RunnerProfile,           // Runner's quiz data
  currentShoes: CurrentShoe[],      // Current shoe rotation
  intent: "add" | "replace",        // Adding vs replacing
  constraints?: {                   // Optional filters
    brandOnly?: string,
    stabilityPreference?: "neutral_only" | "stability_only" | "no_preference",
    maxPrice?: RetailPriceCategory
  }
}
```

**Response (Success 200):**
```typescript
{
  success: true,
  result: {
    gap: Gap,                       // Primary gap identified
    recommendations: [              // Exactly 3 shoes
      RecommendedShoe,              // Close match 1
      RecommendedShoe,              // Close match 2
      RecommendedShoe               // Trade-off option
    ],
    summaryReasoning: string        // 2-3 sentence summary
  }
}
```

**Response (Error 4xx/5xx):**
```typescript
{
  success: false,
  error: string                     // Error message
}
```

**Error Codes:**
- `400` - Invalid request body
- `405` - Method not allowed (must be POST)
- `500` - Server error or recommendation generation failure

**Example Request:**
```json
{
  "profile": {
    "firstName": "Sarah",
    "experience": "intermediate",
    "primaryGoal": "train_for_race",
    "runningPattern": "structured_training",
    "feelPreferences": {
      "softVsFirm": 3,
      "stableVsNeutral": 3,
      "bouncyVsDamped": 2
    }
  },
  "currentShoes": [
    {
      "shoeId": "shoe_0001",
      "roles": ["daily", "easy"],
      "sentiment": "like"
    }
  ],
  "intent": "add"
}
```

**Example Response:**
```json
{
  "success": true,
  "result": {
    "gap": {
      "type": "coverage",
      "severity": "high",
      "reasoning": "You're training for a race but don't have a shoe for tempo workouts. A responsive trainer would help you nail those threshold efforts.",
      "missingCapability": "tempo"
    },
    "recommendations": [
      {
        "shoeId": "shoe_0015",
        "fullName": "Nike Pegasus 41",
        "brand": "Nike",
        "recommendationType": "close_match",
        "matchReason": "Responsive trainer with firm foam for efficient tempo efforts",
        "keyStrengths": [
          "Firm, responsive platform for efficiency",
          "Versatile across 3+ run types"
        ],
        "weight_g": 281,
        "has_plate": false,
        "cushion_softness_1to5": 3
      },
      {
        "shoeId": "shoe_0032",
        "fullName": "ASICS Gel Cumulus 27",
        "brand": "ASICS",
        "recommendationType": "close_match_2",
        "matchReason": "Responsive trainer with firm foam for efficient tempo efforts",
        "keyStrengths": [
          "Energetic, bouncy foam returns energy",
          "Lightweight (261g) for nimble feel"
        ],
        "weight_g": 261,
        "has_plate": false,
        "cushion_softness_1to5": 3
      },
      {
        "shoeId": "shoe_0055",
        "fullName": "Nike Vaporfly 3",
        "brand": "Nike",
        "recommendationType": "trade_off_option",
        "matchReason": "Plated shoe for faster-paced training and workouts",
        "keyStrengths": [
          "ZoomX + carbon plate adds snap and propulsion",
          "Lightweight (215g) for nimble feel"
        ],
        "tradeOffs": "Premium price point",
        "weight_g": 215,
        "has_plate": true,
        "cushion_softness_1to5": 3
      }
    ],
    "summaryReasoning": "You're training for a race but don't have a shoe for tempo workouts. A responsive trainer would help you nail those threshold efforts. I've recommended 3 shoes to cover tempo runs from Nike, ASICS. Note: Nike Vaporfly 3 offers a different approach but premium price point."
  }
}
```

---

## Pipeline Flow

```
POST /api/analyze
      ↓
1. Validate request (method, body, required fields)
      ↓
2. Load shoe catalogue (72 shoes from shoebase.json)
      ↓
3. Analyze rotation
   - analyzeRotation(currentShoes, profile, catalogue)
   - Returns: covered roles, missing roles, redundancies
      ↓
4. Identify primary gap
   - identifyPrimaryGap(analysis, profile, currentShoes, catalogue)
   - Returns: single most important gap (coverage/performance/recovery/redundancy)
      ↓
5. Generate recommendations
   - generateRecommendations(gap, profile, currentShoes, catalogue)
   - Returns: exactly 3 shoes (2 close matches + 1 trade-off)
      ↓
6. Build summary reasoning
   - Combines gap reasoning + recommendation overview
      ↓
7. Return response
   - 200 with result OR error code with message
```

---

## Response Time

**Target:** < 2 seconds
**Typical:** 200-500ms

**Breakdown:**
- Catalogue load: ~10ms
- Rotation analysis: ~50ms
- Gap detection: ~20ms
- Recommendation generation: ~100-300ms
- Response formatting: ~10ms

---

## Logging

All requests are logged for debugging:

```
[analyze] Request: { profileGoal, currentShoesCount, intent }
[analyze] Catalogue loaded: 72 shoes
[analyze] Rotation analyzed: { coveredRoles, missingRoles, redundancyCount }
[analyze] Gap identified: { type, severity, missingCapability }
[analyze] Recommendations generated: [shoe names + types]
[analyze] Success. Elapsed time: XXXms
```

Errors are logged with full context:
```
[analyze] Recommendation generation failed: Could not find 3 candidates
[analyze] Unexpected error: [error details]
```

---

## Testing Locally

### 1. Start Dev Server
```bash
npx vercel dev --listen 8080
```

### 2. Test Request
```bash
curl -X POST http://localhost:8080/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "profile": {
      "firstName": "Test",
      "experience": "intermediate",
      "primaryGoal": "general_fitness",
      "runningPattern": "mostly_easy",
      "feelPreferences": { "softVsFirm": 3, "stableVsNeutral": 3, "bouncyVsDamped": 3 }
    },
    "currentShoes": [],
    "intent": "add"
  }'
```

### 3. Expected Response
```json
{
  "success": true,
  "result": {
    "gap": {
      "type": "coverage",
      "severity": "high",
      "reasoning": "You need a versatile daily trainer to start building your rotation...",
      "missingCapability": "daily"
    },
    "recommendations": [
      { "fullName": "Nike Pegasus 41", ... },
      { "fullName": "ASICS Gel Cumulus 27", ... },
      { "fullName": "HOKA Clifton 10", ... }
    ],
    "summaryReasoning": "..."
  }
}
```

---

## Error Handling

### Invalid Request Body
```bash
curl -X POST http://localhost:8080/api/analyze \
  -H "Content-Type: application/json" \
  -d '{ "invalid": "data" }'
```
**Response (400):**
```json
{
  "success": false,
  "error": "Invalid request body. Required: profile, currentShoes (array), intent."
}
```

### Method Not Allowed
```bash
curl -X GET http://localhost:8080/api/analyze
```
**Response (405):**
```json
{
  "success": false,
  "error": "Method not allowed. Use POST."
}
```

### Recommendation Generation Failure
If constraints are too restrictive:
**Response (500):**
```json
{
  "success": false,
  "error": "Could not generate recommendations: Unable to find 3 suitable recommendations. Only found 2 candidates."
}
```

---

## Integration with Frontend

### React Example
```typescript
import { useState } from 'react';
import type { AnalyzeRequest, AnalyzeResponse } from './api/types';

async function getRecommendations(
  profile: RunnerProfile,
  currentShoes: CurrentShoe[]
): Promise<AnalyzeResponse> {
  const request: AnalyzeRequest = {
    profile,
    currentShoes,
    intent: 'add',
  };

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  return response.json();
}

// Usage
const { success, result, error } = await getRecommendations(profile, currentShoes);

if (success) {
  console.log('Gap:', result.gap);
  console.log('Recommendations:', result.recommendations);
} else {
  console.error('Error:', error);
}
```

---

## Rate Limiting

**Current:** None (MVP)

**Future Consideration:**
- 10 requests per minute per IP
- Cached responses for identical requests (1 hour TTL)

---

## Deployment

### Vercel Deployment
```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel
```

### Environment Variables
None required for MVP. Catalogue is bundled in deployment.

**Future:**
- `DATABASE_URL` - When migrating to Supabase
- `OPENAI_API_KEY` - For chat endpoint

---

## Next Steps

### Immediate
1. ✅ Implement `/api/analyze` endpoint
2. ⏳ Implement `/api/chat` endpoint for conversational explanations
3. ⏳ Test with real profile/shoe data
4. ⏳ Deploy to Vercel preview

### Future Enhancements
- Response caching (Redis)
- Request validation middleware
- Rate limiting
- Analytics tracking
- A/B testing for recommendation strategies

---

## Support

For issues or questions:
- Check logs: `vercel logs`
- Review [backend architecture](./lib/README_backend.md)
- Test modules individually (see `/api/test/`)
