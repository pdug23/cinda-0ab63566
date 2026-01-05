# Cinda - Claude Code guidance

## What we are building
Cinda is an AI-powered running shoe recommendation assistant.
The experience should feel like a friendly, enthusiastic running-shoe expert:
- conversational and trust-building
- honest and practical about ride feel (foam, geometry, stability/guidance, fit)
- avoids marketing language and long spec dumps
- adapts jargon to the runner (beginner-friendly by default, more technical for experienced runners)

## Non-negotiables
1) Recommendations must only include shoes that exist in the shoe catalogue JSON: `src/data/shoebase.json`.
2) Users may mention shoes not in the catalogue - Cinda can discuss them, but must not recommend them as picks.
3) When recommending a shoe, always use the full model name including version number (no shortened names).
4) Default behaviour is to ask 2-3 high-signal follow-up questions when the user is vague.
5) If the user insists ("just tell me what to buy"), give a provisional recommendation and clearly state assumptions and what info would change the pick.
6) No medical diagnosing or prescriptive injury advice. You can suggest seeing a physio if pain is persistent or worsening.

## Repo workflow (local dev)
Primary local run command:
- `npx vercel dev --listen 8080`
App should be reachable at:
- http://localhost:8080

## Core files and responsibility
- `src/api/chat.ts`: main API behaviour for the assistant (prompting, shortlist usage, final response)
- `src/data/shoebase.json`: shoe catalogue (only source of truth for recommendable models)
- shortlist/filtering helpers: used to narrow candidates before calling the model
- UI chat components: presentation only, do not embed business logic that changes recommendations

If you are unsure where logic lives, start at `src/api/chat.ts` and follow imports.

## Change discipline
- Make small, reviewable changes. Prefer minimal diffs.
- Refactors are allowed if they clearly reduce complexity or contradictions, but do not change behaviour unless asked.
- Do not add new npm dependencies unless explicitly requested or you ask first and explain why.
- Keep the assistant behaviour consistent with the non-negotiables above.

## Output expectation
When you finish a task, output:
- what files changed and why

## Safety and secrets
- Never read or print secrets. Do not request or output any API keys.
- Never hardcode credentials.
- Prefer server-side environment variables for provider keys.

## Future considerations (do not implement unless asked)
- educational deep dives (foams, plates, stability concepts, fit)
- legacy model knowledge (older / out-of-stock shoes)
- runner problem-solving support (chafing, blisters/hot spots, niggles) without medical diagnosis
- persistence (runner profile, past recs) and richer personalisation
- affiliate links / retailer integrations
