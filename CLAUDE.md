# Cinda - Claude Code Guidance

## What We Are Building

Cinda is a running intelligence app that helps runners understand their shoe rotation and confidently choose their next shoe.

**Product Model (Hybrid):**
- Structured UI collects profile data (quiz: experience, goals, feel preferences)
- Structured UI manages current shoe rotation (add shoes, tag archetypes, sentiment)
- Backend analyzes rotation and identifies gaps with tiered recommendations
- Backend recommends 3 shoes to fill the identified gap
- AI assistant explains recommendations and answers follow-up questions

**Chat is NOT responsible for data collection.**
Chat's job is to explain reasoning, educate, and help explore recommendations.

## Two-Track Experience

### Quick Match (~30 seconds, no auth)
- User selects archetype + adjusts 3 sliders (cushion, stability, energy return)
- Returns 3 recommendations immediately
- Endpoint: `POST /api/quick-recommendations`

### Full Analysis (complete profile + chat context)
- Complete profile with current rotation
- Tiered recommendations based on rotation health
- Chat context extraction for personalization
- Endpoint: `POST /api/analyze`

**Modes:**
- "Find a specific shoe" (Discovery) - shopping for a particular type
- "Check my rotation" (Analysis) - evaluate current setup and find gaps

## Personality & Tone

Cinda should feel like a knowledgeable running-shoe expert:
- Calm, confident, and conversational
- Honest and practical about ride feel (foam character, geometry, stability, fit)
- Avoids marketing language and spec dumps
- Adapts language to runner experience level (beginner-friendly by default)
- Never salesy or hype-driven

## Non-Negotiables

1. **Catalogue-grounded recommendations:**
   - Only recommend shoes from `src/data/shoebase.json`
   - Users may ask about shoes outside catalogue - Cinda can discuss generically but must not recommend them

2. **Exact model names:**
   - Always use full name including version (e.g., "Nike Pegasus 41", not "Pegasus")

3. **No hallucinations:**
   - Never invent shoe models, specs, or availability
   - If unsure, say so clearly

4. **Three-shoe recommendation pattern:**
   - Always recommend exactly 3 shoes when making recommendations
   - Badges: `closest_match`, `close_match`, `trade_off`
   - Explain differences and trade-offs clearly

5. **No medical advice:**
   - Do not diagnose injuries or prescribe treatment
   - Can suggest seeing a physio if pain is persistent/worsening
   - Keep focus on shoe mechanics (stability, cushioning, fit)

6. **Trust over cleverness:**
   - False confidence is the worst failure
   - If analysis is uncertain, state assumptions clearly
   - Better to ask one clarifying question than make wrong recommendation

## Architecture Overview

### Classification System (Archetypes)

Shoes are classified using boolean flags, not string roles:

```typescript
is_daily_trainer: boolean;   // Versatile everyday trainers
is_recovery_shoe: boolean;   // Easy day / recovery focused
is_workout_shoe: boolean;    // Tempo, intervals, speed work
is_race_shoe: boolean;       // Race day performance
is_trail_shoe: boolean;      // Off-road running
is_super_trainer: boolean;   // 12 versatile shoes that handle easy → intervals
```

**Super Trainers:** Special category of 12 shoes versatile enough to handle everything from easy runs to intervals. Receive +10 versatility bonus in scoring.

### Tiered Rotation Analysis

- **Tier 1:** Genuine gaps (missing something important)
- **Tier 2:** Improvement opportunities (covered but could be better)
- **Tier 3:** Exploration (solid rotation, try something different)

### Rotation Health Scoring

Four dimensions, each 0-100:
- **Coverage:** Are all necessary archetypes covered?
- **Load Resilience:** Can the rotation handle training load?
- **Variety:** Sufficient diversity in feel and purpose?
- **Goal Alignment:** Does rotation match stated goals?

### Backend (VS Code + Claude Code)

```
/api/
├── types.ts                    # TypeScript types for all data structures
├── analyze.ts                  # Handles both Discovery and Analysis modes
├── quick-recommendations.ts    # Quick Match endpoint
├── chat.ts                     # Explains recommendations conversationally
├── lib/
│   ├── shoeRetrieval.ts       # Get candidate shoes, filter by archetypes
│   ├── rotationAnalyzer.ts    # Analyze rotation, calculateRotationHealth()
│   ├── tierClassifier.ts      # classifyRotationTier(), detectFeelGaps()
│   ├── gapDetector.ts         # Identify archetype-based gaps
│   ├── recommendationEngine.ts # Generate 3 shoes, bullet generation, contrast mode
│   └── summaryGenerator.ts    # generateRotationSummary() via OpenAI
```

### Frontend (Lovable)

```
/src/
├── pages/
│   ├── Quiz.tsx               # Profile collection (experience, goal, feel sliders)
│   ├── AddShoes.tsx           # Current rotation management
│   ├── Recommendations.tsx    # Display 3 shoe cards with badges
│   └── Chat.tsx               # Conversational explanation layer
└── data/
    └── shoebase.json          # Shoe catalogue (archetypes, common_issues)
```

### Data Flow

```
Quick Match: Archetype + Sliders → /api/quick-recommendations → 3 Shoes

Full Analysis:
Quiz → Add Shoes → /api/analyze → Tiered Recommendations → Chat Explanation
  ↓         ↓              ↓                    ↓                      ↓
localStorage  localStorage  rotationHealth    localStorage          /api/chat
                            + tier + summary
```

## Core Concepts

### Scoring System

14 modifiers affect shoe scoring:
- Feel preferences (cushion, stability, energy return)
- BMI calculations
- Pace targets
- Foot strike pattern
- Chat context (injuries, surfaces, climate, past shoes)
- And more...

**Contrast Mode (Tier 3):** When rotation is solid, rewards shoes that differ from current rotation to encourage exploration.

**Acceptable Ranges:** "Let Cinda decide" options use ranges, not single target values.

### Chat Context Extraction

Structured extraction via Claude API captures:
- Injuries and triggers
- Running surfaces
- Climate/conditions
- Past shoe experiences
- Fit quirks
- Training context

Applied as scoring modifiers for personalized recommendations.

### Bullet Generation

- **Model:** GPT-4o-mini (NOT GPT-5-mini — reasoning tokens killed performance)
- **Execution:** Parallelized (all 3 shoes simultaneously)
- **Structure:** 3 bullets per shoe:
  1. Personal match (references rotation or preferences)
  2. Education (teaches one thing about ride/fit/stability)
  3. Standout + use case (notable tech + when to use)

### Common Issues Field

Shoes have a `common_issues` array for known fit/durability/stability problems:

```typescript
common_issues: string[];  // ["category:description", ...]
// Example: ["fit:snug midfoot for high-volume feet", "durability:outsole wears quickly"]
```

Categories: fit, durability, stability, weight, etc.

## Key Types

```typescript
// Archetype flags (booleans, not strings)
interface ShoeArchetypes {
  is_daily_trainer: boolean;
  is_recovery_shoe: boolean;
  is_workout_shoe: boolean;
  is_race_shoe: boolean;
  is_trail_shoe: boolean;
  is_super_trainer: boolean;
}

// Rotation health
interface RotationHealth {
  coverage: number;       // 0-100
  loadResilience: number; // 0-100
  variety: number;        // 0-100
  goalAlignment: number;  // 0-100
}

// Tier classification
type Tier = 1 | 2 | 3;

// Recommendation badges
type Badge = "closest_match" | "close_match" | "trade_off";
```

## API Contracts

### POST /api/quick-recommendations

**Request:**
```typescript
{
  archetype: "daily_trainer" | "recovery_shoe" | "workout_shoe" | "race_shoe" | "trail_shoe";
  preferences: {
    cushion: number;      // 1-5
    stability: number;    // 1-5
    energyReturn: number; // 1-5
  };
}
```

**Response:**
```typescript
{
  recommendations: RecommendedShoe[];  // Always 3
  archetype: string;
}
```

### POST /api/analyze

**Request:**
```typescript
{
  profile: RunnerProfile;
  currentShoes: CurrentShoe[];
  mode: "discovery" | "analysis";
  chatContext?: ExtractedContext;
  constraints?: { brandOnly?: string; stabilityPreference?: string };
}
```

**Response:**
```typescript
{
  success: boolean;
  result?: {
    recommendations: RecommendedShoe[];  // Always 3, with badges and bullets
    rotationHealth?: RotationHealth;     // Analysis mode only
    tier?: Tier;                         // Analysis mode only
    summary?: string;                    // Analysis mode only
    gap: Gap;
  };
  error?: string;
}
```

### POST /api/chat

**Request:**
```typescript
{
  profile: RunnerProfile;
  currentShoes: CurrentShoe[];
  recommendations: RecommendedShoe[];
  gap: Gap;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}
```

**Response:**
```typescript
{
  reply: string;
}
```

## State Management

**Current:**
- Frontend uses localStorage for persistence
- Backend is stateless (receives context with each request)
- Keys: `cindaProfile`, `cindaShoes`, `cindaRecommendations`

**Post-MVP:**
- Migrate to Supabase for user accounts and multi-device sync

## Local Development

**Primary dev command:**
```bash
npx vercel dev --listen 8080
```

**App available at:**
```
http://localhost:8080
```

**Environment variables:**
- `OPENAI_API_KEY` - For chat and summary generation
- Store in `.env.local` (gitignored)

## Change Discipline

**When making changes:**
1. Make small, focused commits (one file or one feature at a time)
2. Prefer minimal diffs - don't reformat entire files unnecessarily
3. Test before committing (especially backend logic)
4. Keep UI concerns in Lovable, logic concerns in VS Code

**Refactoring rules:**
- Refactors allowed if they clearly reduce complexity
- Do not change behavior unless explicitly requested
- Ask before adding new npm dependencies

**When you finish a task, output:**
- What files changed
- What functionality was added/modified
- How to test it

## Safety & Secrets

- Never read, print, or log API keys or secrets
- Never hardcode credentials
- Use server-side environment variables (`.env.local`)
- API keys should never appear in frontend code

## Common Pitfalls to Avoid

1. **Don't let chat collect data** - That's the UI's job
2. **Don't recommend outside the catalogue** - Trust is everything
3. **Don't make up shoe specs** - Use only what's in shoebase.json
4. **Don't analyze rotation in chat.ts** - That's rotationAnalyzer.ts's job
5. **Don't build complex state logic in frontend** - Keep it in backend
6. **Don't use GPT-5-mini for bullets** - Reasoning tokens kill performance, use GPT-4o-mini
7. **Don't use string roles** - Use archetype boolean flags

## Future Considerations (Do Not Implement Unless Asked)

- Educational deep dives (foam types, plate tech, stability concepts)
- Legacy shoe knowledge (out-of-stock models)
- Problem-solving support (chafing, blisters, niggles) - non-medical
- Supabase integration (user accounts, persistent state)
- Multi-device sync
- Affiliate link tracking
- Price comparison across retailers
- Rotation evolution tracking over time

## Success Criteria

**For each task:**
- Code runs without errors
- Follows architecture (UI in Lovable, logic in VS Code)
- No hallucinations (shoe names match catalogue exactly)
- Clear, testable, maintainable

**For the product:**
- Quick Match delivers 3 relevant shoes in <2 seconds
- Full Analysis correctly identifies rotation tier
- Rotation health scores reflect actual gaps
- Recommendations feel personalized (chat context applied)
- Chat explains reasoning clearly
- User trusts the recommendation enough to consider buying
