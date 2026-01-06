# Cinda - Claude Code Guidance

## What We Are Building

Cinda is a running intelligence app that helps runners understand their shoe rotation and confidently choose their next shoe.

**Product Model (Hybrid):**
- Structured UI collects profile data (quiz: experience, goals, feel preferences)
- Structured UI manages current shoe rotation (add shoes, tag roles, sentiment)
- Backend analyzes rotation and identifies gaps (coverage, performance, recovery)
- Backend recommends 3 shoes to fill the identified gap
- AI assistant explains recommendations and answers follow-up questions

**Chat is NOT responsible for data collection.**
Chat's job is to explain reasoning, educate, and help explore recommendations.

## Personality & Tone

Cinda should feel like a knowledgeable running-shoe expert:
- Calm, confident, and conversational
- Honest and practical about ride feel (foam character, geometry, stability, fit)
- Avoids marketing language and spec dumps
- Adapts language to runner experience level (beginner-friendly by default)
- Never salesy or hype-driven

## Non-Negotiables

1. **Catalogue-grounded recommendations:**
   - Only recommend shoes from `src/data/shoebase.json` (72 shoes)
   - Users may ask about shoes outside catalogue - Cinda can discuss generically but must not recommend them

2. **Exact model names:**
   - Always use full name including version (e.g., "Nike Pegasus 40", not "Pegasus")

3. **No hallucinations:**
   - Never invent shoe models, specs, or availability
   - If unsure, say so clearly

4. **Three-shoe recommendation pattern:**
   - Always recommend exactly 3 shoes when making recommendations
   - 2 close matches + 1 trade-off option
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

### Backend (VS Code + Claude Code)

```
/api/
├── types.ts                    # TypeScript types for all data structures
├── lib/
│   ├── shoeRetrieval.ts       # Get candidate shoes from catalogue
│   ├── rotationAnalyzer.ts    # Analyze current shoe setup
│   ├── gapDetector.ts         # Identify coverage/performance/recovery gaps
│   └── recommendationEngine.ts # Generate 3 shoes to fill gap
├── analyze.ts                  # API: Takes profile+shoes → returns gap+3 recommendations
└── chat.ts                     # API: Explains recommendations conversationally
```

### Frontend (Lovable)

```
/src/
├── pages/
│   ├── Quiz.tsx               # Profile collection (experience, goal, feel sliders)
│   ├── AddShoes.tsx           # Current rotation management
│   ├── Recommendations.tsx    # Display 3 shoe cards
│   └── Chat.tsx               # Conversational explanation layer
└── data/
    └── shoebase.json          # 72-shoe catalogue (source of truth)
```

### Data Flow

```
Quiz → Add Shoes → Backend Analysis → Recommendations Display → Chat Explanation
  ↓         ↓              ↓                    ↓                      ↓
localStorage  localStorage  /api/analyze     localStorage          /api/chat
```

## Core Files & Responsibilities

**Backend Logic (Claude Code owns these):**
- `/api/types.ts` - All TypeScript definitions
- `/api/lib/rotationAnalyzer.ts` - Identifies what roles are covered/missing
- `/api/lib/gapDetector.ts` - Determines primary gap (coverage, performance, recovery, redundancy)
- `/api/lib/recommendationEngine.ts` - Selects 3 shoes that fill the gap
- `/api/analyze.ts` - Orchestrates analysis and returns recommendations
- `/api/chat.ts` - Explains recommendations, answers follow-ups (NO data collection)

**Frontend UI (Lovable owns these):**
- Quiz flow, add shoes UI, recommendation cards, chat interface
- All UI code lives in `/src/`

**Shared Data:**
- `/src/data/shoebase.json` - 72-shoe catalogue (read-only, precious)

## State Management

**MVP:**
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

**Testing backend in isolation:**
```bash
# Create test files in /api/test/
node --loader ts-node/esm api/test/testHarness.ts
```

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

## API Contracts

### POST /api/analyze

**Request:**
```typescript
{
  profile: RunnerProfile,
  currentShoes: CurrentShoe[],
  intent: "add" | "replace",
  constraints?: { brandOnly?: string, stabilityPreference?: string }
}
```

**Response:**
```typescript
{
  success: boolean,
  result?: {
    gap: Gap,
    recommendations: RecommendedShoe[], // Always 3
    summaryReasoning: string
  },
  error?: string
}
```

### POST /api/chat

**Request:**
```typescript
{
  profile: RunnerProfile,
  currentShoes: CurrentShoe[],
  recommendations: RecommendedShoe[],
  gap: Gap,
  messages: Array<{ role: "user" | "assistant", content: string }>
}
```

**Response:**
```typescript
{
  reply: string
}
```

## Safety & Secrets

- Never read, print, or log API keys or secrets
- Never hardcode credentials
- Use server-side environment variables (`.env.local`)
- API keys should never appear in frontend code

## Future Considerations (Do Not Implement Unless Asked)

- Educational deep dives (foam types, plate tech, stability concepts)
- Legacy shoe knowledge (out-of-stock models)
- Problem-solving support (chafing, blisters, niggles) - non-medical
- Supabase integration (user accounts, persistent state)
- Multi-device sync
- Affiliate link tracking
- Price comparison across retailers
- Rotation evolution tracking over time

## Common Pitfalls to Avoid

1. **Don't let chat collect data** - That's the UI's job now
2. **Don't recommend outside the 72-shoe catalogue** - Trust is everything
3. **Don't make up shoe specs** - Use only what's in shoebase.json
4. **Don't analyze rotation in chat.ts** - That's rotationAnalyzer.ts's job
5. **Don't build complex state logic in frontend** - Keep it in backend

## Success Criteria

**For each Epic:**
- Code runs without errors
- Meets acceptance criteria in Epic definition
- Follows architecture (UI in Lovable, logic in VS Code)
- No hallucinations (shoe names match catalogue exactly)
- Clear, testable, maintainable

**For MVP overall:**
- User completes quiz in <2 minutes
- User adds 1-3 current shoes easily
- Backend identifies sensible gap
- Recommends 3 real shoes that address gap
- Chat explains reasoning clearly
- User trusts the recommendation enough to consider buying