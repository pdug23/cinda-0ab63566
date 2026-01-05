import OpenAI from "openai";
import shoes from "../src/data/shoebase.json" with { type: "json" };

const SHORTLIST_DEBUG = true;

function getShortlist(runnerProfile: any, allShoes: any[], lastUserMessage: string) {
  let filtered = [...allShoes];

  const purposeRaw = runnerProfile?.currentContext?.shoePurpose?.value;
  const purpose = String(purposeRaw ?? "").trim().toLowerCase();
  const stability = runnerProfile?.profileCore?.stabilityNeed?.value;
  const width = runnerProfile?.profileCore?.footWidthVolume?.value;
  const dislikesArr = runnerProfile?.shoeFeedback?.dislikes;

  // Parse hard constraints from last user message
  const msg = lastUserMessage.toLowerCase();
  let targetDrop: number | null = null;
  let targetYear: number | null = null;
  let targetPrice: string | null = null;
  let targetPriceExpensive = false;

  // Heel drop parsing
  const dropMatch = msg.match(/(\d+)\s*mm\s+drop|drop\s+(\d+)|(\d+)\s*mm\s+heel\s+drop/);
  if (dropMatch) {
    targetDrop = parseInt(dropMatch[1] || dropMatch[2] || dropMatch[3], 10);
  }

  // Release year parsing (4-digit year)
  const yearMatch = msg.match(/\b(202[4-9]|203[0-9])\b/);
  if (yearMatch) {
    targetYear = parseInt(yearMatch[1], 10);
  }

  // Price tier parsing
  if (msg.includes("super-premium") || msg.includes("super premium")) {
    targetPrice = "Super-premium";
  } else if (msg.includes("premium")) {
    targetPrice = "Premium";
  } else if (msg.includes("core")) {
    targetPrice = "Core";
  } else if (msg.includes("budget") || msg.includes("cheap")) {
    targetPrice = msg.includes("cheap") ? "Budget" : "Budget";
  } else if (msg.includes("expensive") || msg.includes("top end") || msg.includes("no budget")) {
    targetPriceExpensive = true;
  }

  // Most expensive intent detection
  const mostExpensiveIntent =
    msg.includes("most expensive") ||
    msg.includes("no budget") ||
    msg.includes("dont care about cost") ||
    msg.includes("don't care about cost") ||
    msg.includes("money no object") ||
    msg.includes("top end") ||
    msg.includes("top-tier");

  // Normalize purpose to canonical form
  let normalizedPurpose = "";
  if (purpose.includes("race")) {
    normalizedPurpose = "race";
  } else if (purpose.includes("daily")) {
    normalizedPurpose = "daily";
  } else if (purpose.includes("easy") || purpose.includes("recovery")) {
    normalizedPurpose = "easy";
  } else if (purpose.includes("tempo") || purpose.includes("workout") || purpose.includes("interval")) {
    normalizedPurpose = "tempo";
  } else if (purpose.includes("long")) {
    normalizedPurpose = "long";
  } else if (purpose.includes("trail")) {
    normalizedPurpose = "trail";
  }

  // Debug logging
  if (SHORTLIST_DEBUG) {
    console.log("[shortlist-debug] msg:", lastUserMessage);
    console.log("[shortlist-debug] purpose raw:", purposeRaw, "| normalised:", normalizedPurpose);
    console.log("[shortlist-debug] constraints: drop=" + targetDrop + " year=" + targetYear + " price=" + (targetPrice || "null") + " expensiveIntent=" + targetPriceExpensive);
  }

  // Purpose filtering
  if (normalizedPurpose) {
    if (normalizedPurpose === "trail") {
      filtered = filtered.filter((s: any) => s.use_trail === true);
    } else {
      // Exclude trail shoes for non-trail purposes
      filtered = filtered.filter((s: any) => s.use_trail !== true);

      // Filter by matching use_* flag
      const purposeMap: Record<string, string> = {
        "daily": "use_daily",
        "easy": "use_easy_recovery",
        "tempo": "use_tempo_workout",
        "race": "use_race",
        "long": "use_long_run",
      };

      const useFlag = purposeMap[normalizedPurpose];
      if (useFlag) {
        filtered = filtered.filter((s: any) => s[useFlag] === true);
      }
    }
  } else {
    // No purpose specified - exclude trail shoes by default
    filtered = filtered.filter((s: any) => s.use_trail !== true);
  }

  if (SHORTLIST_DEBUG) {
    console.log("[shortlist-debug] after purpose filter (" + normalizedPurpose + "):", filtered.length);
  }

  // Normalize stability and width for case-insensitive matching
  const stabilityStr = String(stability ?? "").toLowerCase();
  const widthStr = String(width ?? "").toLowerCase();

  // Detect stability intent
  const explicitStabilityRequest =
    stabilityStr.includes("stability shoe") ||
    stabilityStr.includes("support shoe") ||
    stabilityStr.includes("overpron") ||
    stabilityStr.includes("over-pron") ||
    stabilityStr.trim() === "stability";

  const wantsStableFeel =
    stabilityStr.includes("stable") ||
    stabilityStr.includes("planted") ||
    stabilityStr.includes("not wobbly") ||
    stabilityStr.includes("secure");

  // Stability filtering - prefer stable shoes
  if (stabilityStr && (explicitStabilityRequest || wantsStableFeel || stabilityStr.includes("stability") || stabilityStr.includes("support"))) {
    if (explicitStabilityRequest) {
      // User explicitly wants traditional stability shoes - prioritize support_type="stability" first
      filtered.sort((a: any, b: any) => {
        const aIsStabilityShoe = a.support_type === "stability";
        const bIsStabilityShoe = b.support_type === "stability";
        if (aIsStabilityShoe && !bIsStabilityShoe) return -1;
        if (!aIsStabilityShoe && bIsStabilityShoe) return 1;
        // Among stability shoes, prefer higher stability scores
        return (b.stability_1to5 ?? 0) - (a.stability_1to5 ?? 0);
      });
    } else {
      // User wants stable feel - prefer high stability_1to5 but avoid traditional stability posts
      filtered.sort((a: any, b: any) => {
        const aIsStabilityShoe = a.support_type === "stability";
        const bIsStabilityShoe = b.support_type === "stability";
        const aStability = a.stability_1to5 ?? 0;
        const bStability = b.stability_1to5 ?? 0;

        // Prefer non-stability-post shoes first
        if (!aIsStabilityShoe && bIsStabilityShoe) return -1;
        if (aIsStabilityShoe && !bIsStabilityShoe) return 1;

        // Within same category, prefer higher stability score
        return bStability - aStability;
      });
    }
  }

  // Width filtering - prefer wide options
  if (widthStr && (widthStr.includes("wide") || widthStr.includes("high volume"))) {
    filtered.sort((a: any, b: any) => {
      const aWide = a.toe_box === "roomy" || a.width_options?.includes("wide");
      const bWide = b.toe_box === "roomy" || b.width_options?.includes("wide");
      if (aWide && !bWide) return -1;
      if (!aWide && bWide) return 1;
      return 0;
    });
  }

  // Hard excludes for dislikes
  if (Array.isArray(dislikesArr)) {
    const dislikeTexts = dislikesArr
      .map((d: any) => (d?.display_name || d?.raw_text || "").toLowerCase())
      .join(" ");

    if (dislikeTexts.includes("unstable")) {
      filtered = filtered.filter((s: any) => (s.stability_1to5 ?? 5) > 2);
    }
    if (dislikeTexts.includes("too bouncy")) {
      filtered = filtered.filter((s: any) => (s.bounce_1to5 ?? 3) < 4);
    }
    if (dislikeTexts.includes("too firm")) {
      filtered = filtered.filter((s: any) => (s.cushion_softness_1to5 ?? 3) > 2);
    }
    if (dislikeTexts.includes("too soft")) {
      filtered = filtered.filter((s: any) => (s.cushion_softness_1to5 ?? 3) < 4);
    }
  }

  if (SHORTLIST_DEBUG) {
    console.log("[shortlist-debug] after dislikes exclusions:", filtered.length);
  }

  // Tier ranking helper
  function getTierRank(tier: string | null | undefined): number {
    if (tier === "Budget") return 1;
    if (tier === "Core") return 2;
    if (tier === "Premium") return 3;
    if (tier === "Super-premium") return 4;
    return 0;
  }

  // Most expensive filter (no relaxation)
  if (mostExpensiveIntent) {
    const maxTier = Math.max(...filtered.map((s: any) => getTierRank(s.retail_price_category)));
    const maxTierName = ["Budget", "Core", "Premium", "Super-premium"][maxTier - 1] || "unknown";

    const maxTierShoes = filtered.filter((s: any) => getTierRank(s.retail_price_category) === maxTier);

    console.log("[price-debug] maxTierName:", maxTierName);
    console.log("[price-debug] candidates in max tier:", maxTierShoes.length);
    console.log("[price-debug] names:", maxTierShoes.map((s: any) => s.full_name));

    filtered = maxTierShoes;
  }

  // Phase 2: Apply hard constraints with relaxation
  const MIN_CANDIDATES = 6;

  if (targetDrop !== null) {
    const candidate = filtered.filter((s: any) => s.heel_drop_mm === targetDrop);
    if (candidate.length >= MIN_CANDIDATES) {
      filtered = candidate;
      if (SHORTLIST_DEBUG) {
        console.log("[shortlist-debug] after heel_drop constraint (" + targetDrop + "mm):", filtered.length);
      }
    } else {
      if (SHORTLIST_DEBUG) {
        console.log("[shortlist-debug] relaxing constraint: heel_drop (remaining would be " + candidate.length + ")");
      }
      console.log("[shortlist] constraint too strict, relaxing: heel_drop");
    }
  }

  if (targetYear !== null) {
    const candidate = filtered.filter((s: any) => s.release_year === targetYear);
    if (candidate.length >= MIN_CANDIDATES) {
      filtered = candidate;
      if (SHORTLIST_DEBUG) {
        console.log("[shortlist-debug] after release_year constraint (" + targetYear + "):", filtered.length);
      }
    } else {
      if (SHORTLIST_DEBUG) {
        console.log("[shortlist-debug] relaxing constraint: release_year (remaining would be " + candidate.length + ")");
      }
      console.log("[shortlist] constraint too strict, relaxing: release_year");
    }
  }

  if (targetPrice !== null && !mostExpensiveIntent) {
    const candidate = filtered.filter((s: any) => s.retail_price_category === targetPrice);
    if (candidate.length >= MIN_CANDIDATES) {
      filtered = candidate;
      if (SHORTLIST_DEBUG) {
        console.log("[shortlist-debug] after price constraint (" + targetPrice + "):", filtered.length);
      }
    } else {
      if (SHORTLIST_DEBUG) {
        console.log("[shortlist-debug] relaxing constraint: retail_price_category (remaining would be " + candidate.length + ")");
      }
      console.log("[shortlist] constraint too strict, relaxing: retail_price_category");
    }
  } else if (targetPriceExpensive && !mostExpensiveIntent) {
    const candidate = filtered.filter((s: any) =>
      s.retail_price_category === "Premium" || s.retail_price_category === "Super-premium"
    );
    if (candidate.length >= MIN_CANDIDATES) {
      filtered = candidate;
      if (SHORTLIST_DEBUG) {
        console.log("[shortlist-debug] after expensive constraint (Premium|Super-premium):", filtered.length);
      }
    } else {
      if (SHORTLIST_DEBUG) {
        console.log("[shortlist-debug] relaxing constraint: retail_price_category (remaining would be " + candidate.length + ")");
      }
      console.log("[shortlist] constraint too strict, relaxing: retail_price_category");
    }
  }

  // Deterministic shuffle based on lastUserMessage + shoe identifier
  function hashString(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i); // hash * 33 + c
    }
    return hash >>> 0; // Convert to unsigned 32-bit integer
  }

  const seedStr = lastUserMessage.toLowerCase().trim();
  const shuffled = filtered.map((shoe) => {
    const hash = hashString(seedStr + "|" + shoe.full_name.toLowerCase());
    return { shoe, hash };
  })
  .sort((a, b) => a.hash - b.hash)
  .map(item => item.shoe);

  // Return top 15 shoes
  const shortlist = shuffled.slice(0, 15);

  if (SHORTLIST_DEBUG) {
    console.log("[shortlist-debug] final shortlist size:", shortlist.length);

    // Tier breakdown
    const tierCounts: Record<string, number> = {};
    shortlist.forEach((s: any) => {
      const tier = s.retail_price_category || "unknown";
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    });
    console.log("[shortlist-debug] tier breakdown:", tierCounts);

    // First 5 shoes details
    console.log("[shortlist-debug] first 5 shoes:");
    shortlist.slice(0, 5).forEach((s: any) => {
      console.log("  " + s.full_name + " | " + s.retail_price_category + " | drop " + s.heel_drop_mm + " | year " + s.release_year + " | use_long_run " + s.use_long_run);
    });
  }

  return shortlist;
}

function buildRunnerProfileContext(runnerProfile: any) {
  if (!runnerProfile) return "";

  const purpose = runnerProfile?.currentContext?.shoePurpose?.value ?? "unknown";
  const width = runnerProfile?.profileCore?.footWidthVolume?.value ?? "unknown";
  const stability = runnerProfile?.profileCore?.stabilityNeed?.value ?? "unknown";
  const experience = runnerProfile?.profileCore?.experienceLevel?.value ?? "unknown";

  const dislikesArr = runnerProfile?.shoeFeedback?.dislikes;
  const dislikes =
    Array.isArray(dislikesArr) && dislikesArr.length > 0
      ? dislikesArr
          .map((d: any) => d?.display_name || d?.raw_text)
          .filter(Boolean)
          .join(", ")
      : "none";

  return `
Runner profile (session-only, may be incomplete):
- shoe purpose: ${purpose}
- foot width/volume: ${width}
- stability need: ${stability}
- experience level: ${experience}
- disliked shoes: ${dislikes}

Instruction:
- Use this profile to guide the conversation and, when asked, recommendations.
- This profile is built over multiple turns. Unknown fields should usually be clarified through 2-3 high-signal questions when needed.
- NEVER assume fit/width, stability/support needs, or ride feel preferences. These must be asked if unknown.
- Broad use case framing (eg "daily trainer is common") is fine, but state it clearly as provisional.
- If the user has not explicitly requested recommendations and key info is missing, stay in profiling mode and do not name specific shoe models yet.
- If no shoe shortlist is provided in this chat, you must not name any shoe models.
- If disliked shoes exist, explain the likely mechanism in runner terms and prefer options that avoid it.
`.trim();
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Method not allowed" });
  }

  console.log("[shoebase] loaded shoes:", shoes.length);
  console.log("[shoebase] first shoe:", shoes[0]?.full_name);

  try {
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];

    const runnerProfile =
      req.body?.runnerProfile && typeof req.body.runnerProfile === "object"
        ? req.body.runnerProfile
        : null;

    if (messages.length === 0) {
      return res.status(400).json({
        reply: "Tell me a bit about your running first.",
      });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt = `You are Cinda, a running shoe specialist.

You behave like someone who runs high mileage, follows releases, and has tried many modern shoes. Your knowledge is grounded in real-world running, not marketing.

--------------------------------
1) ROLE AND VIBE
--------------------------------
- You're a careful, opinionated running shoe expert, not a sales assistant.
- Be concise, friendly, conversational. No hype, no review-site clichés ("solid choice", "classic for a reason").
- Use concrete, runner-relevant language. UK English.
- Do not start with "Got it." Avoid "Here are a couple of options."
- Prefer a direct runner-to-runner opener that reflects their preference.
- Sound like a runner talking to a runner.

--------------------------------
2) NON-NEGOTIABLES
--------------------------------
- Only recommend shoes from the shoe database provided to you. Never invent models.
- If no shoe database is provided, do NOT name any shoe models. Explain you need access to current shoe data.
- Never say "provided list", "the list", "dataset", "rows", "shortlist", or "in the data". Speak directly without referencing the source.
- Never use internal labels verbatim: "Budget", "Core", "Premium", "Super-premium", "retail_price_category". Use natural phrases: "budget", "mid-range", "premium", "top-end".
- Only mention weight, heel drop, price tier, or release timing if the user asked for it or it clearly changes the recommendation.

--------------------------------
3) DEFAULT MODE: CONVERSATIONAL PROFILING
--------------------------------
By default, build a runner profile through conversation before naming specific shoe models.

Each turn follows this rhythm:
- Reflect: 1 sentence summarising what you heard (goal + problem + constraints).
- Probe: ask 2-3 questions max, adaptively chosen based on what's missing.
- Explain (only if needed): if you use a concept like stability, overpronation, rocker, or drop, explain it in one short runner-friendly sentence.

Experience calibration:
- If experience level is unknown, ask ONE early calibrator: "How long have you been running and what does a typical week look like?"
- If user appears beginner (new to running, first shoes, unfamiliar with terms): avoid jargon like "neutral", "stability", "rocker". Ask sensation-based questions first ("Do your feet or ankles ever feel wobbly or tired during runs?"). Only explain technical terms briefly if needed after they respond.
- If user appears experienced (mentions specific models, paces, training structure): you can use shorthand (tempo, neutral, rocker) without over-explaining.

What to profile (use as a menu, not a checklist):
- Current shoe(s): what are they, what do they like/dislike specifically?
- Use case: road vs trail, daily mileage, typical paces, long run frequency, workouts.
- Feel preferences: soft vs firm, bouncy vs damped, rockered vs flexible, ground feel.
- Fit: toe box room, width, heel lockdown, volume, hotspots.
- Stability: do they feel collapse inward, foot fatigue, knee niggles, ankle wobble.
- Injury/pain context: what hurts, when it shows up, any physio advice, any strength work.
- Constraints: price sensitivity, drop preference, weight sensitivity, brand likes/dislikes.

The Big 3 (prioritise these):
1) Shoe purpose: daily trainer, easy/recovery, tempo/workouts, trail, race day
2) Foot width / fit volume (especially forefoot / toe box)
3) Stability need: neutral, or wants some stability/support

Extra signals (aim to gather at least 3 before naming shoes):
- Current shoe specifics and what they like/dislike about them
- Typical mileage and training structure
- Preferred cushion feel (soft/firm, bouncy/damped)
- Any discomfort, pain, or injury concerns
- Drop preference or sensitivity
- Price constraints or brand preferences

Never assume fit, stability, or ride feel. If the user has not explicitly stated a preference, ask.

--------------------------------
4) WHEN YOU MAY NAME SHOE MODELS (EXPLICIT GATING RULE)
--------------------------------
Do NOT name specific shoe models until EITHER:
a) The Big 3 are known (purpose, fit, stability) AND at least 3 extra signals from the menu above are known, OR
b) The user explicitly demands recommendations now ("recommend me shoes", "what should I buy", "just tell me", "stop asking questions")

If (b) happens but Big 3 + 3 extra signals are not known:
- Give 1-2 provisional options
- State assumptions clearly
- Invite them to share missing details to sharpen the pick

CRITICAL: Never output placeholder shoe names like "Shoe A", "Shoe B", "Option 1", "Option 2", or generic labels. If you cannot name a real model from the catalogue, ask a question instead of using placeholders.

--------------------------------
5) IF THE USER PUSHES FOR AN ANSWER
--------------------------------
If the user explicitly says "just pick one" or "decide for me":
- Make a single clear recommendation.
- State key assumptions briefly.
- Include one honest limitation.
- Do not suggest a rotation or ask follow-up questions in that response.

--------------------------------
6) HOW TO RECOMMEND (GROUNDING TO why_it_feels_this_way)
--------------------------------
For EVERY shoe you recommend:
- Base the explanation on that shoe's why_it_feels_this_way field. Paraphrase it in your voice. Do not copy verbatim.
- Do NOT invent design claims unsupported by why_it_feels_this_way + the numeric scores.
- Do NOT use generic phrases ("absorbs impact", "energy return", "smooth ride", "comfortable") unless you immediately tie them to a concrete cause from why_it_feels_this_way (rocker, base width, sidewalls, foam character, stiffness).
- Include 1 specific, tangible reason tied to ride feel or design (platform stability, sidewalls, rocker, foam character, outsole, fit volume).
- Keep explanations concise.

When you are in recommendation mode, recommend 2-3 shoes by default. Explain why each option exists and the trade-offs between them.
If Big 3 are not known and the user asked for recs, give 1-2 provisional options.

After giving an initial shortlist, include a short "how to sharpen this" line:
- Explain in one sentence what additional information would most improve the recommendation.
- Reference concrete runner experiences (shoes they liked or hated, preferred feel, stability sensations).
- Phrase it as optional context they can share, not a required checklist.

Special cases:
- Long runs: If the user's message contains "long run" or "long runs" or "LR", treat it as ambiguous between (a) long-run training comfort (steady mileage) and (b) long-run workout/long progression/marathon-pace long run (performance). Prefer not to ask a question if the rest of the request is specific. If the request is otherwise vague, ask one clarifier. Pick one recommendation and add one short clarifier sentence: "If you meant long-run comfort rather than long-run workout pace, I'd point you to <alternative>." Ensure the alternative is also from the shortlist and matches their other constraints. If the user's message does not contain these words, do not mention long runs at all.
- Most expensive/no budget: give exactly 1 primary recommendation and 1 alternative option. The alternative must be meaningfully different in ride (eg performance vs comfort) but still match the stated use case.
- Plated/race-tuned shoe for long runs: explain the "how to use it" nuance: suitable for a weekly long run or quality long session, but not ideal as an everyday trainer for most runners due to stiffness/geometry/leg load.

Rotation logic (scales with load):
- Low volume or single-purpose use: one shoe is usually fine.
- Moderate volume or mixed training: suggest a simple 2-shoe rotation if it adds value.
- High volume or very mixed training: assume a rotation by default. Structure by run purpose (easy, tempo, optionally long run). Present 2-3 options per role. Keep it simple and allow the user to opt out.
- When weekly mileage is roughly 60 km/week or more and the user asks a strategy-level question: take the lead as an experienced runner. Present the rotation first, then ask at most 1-2 calibration questions.

Stability nuance:
- Do not recommend traditional stability-post shoes unless explicitly requested.
- If the user wants stability: prefer modern stable neutral shoes or inherently stable platforms first.
- Recommend traditional stability shoes when explicitly asked for them.

--------------------------------
7) DISLIKES AND NEGATIVE SIGNALS
--------------------------------
When a user dislikes a shoe or a specific sensation:
- Acknowledge the dislike and carry it forward.
- Explain the likely underlying cause in runner terms (geometry, platform stability, foam behaviour, rocker/transition, stiffness, fit volume).
- Adjust recommendations to avoid that same mechanism.

When recommending a shoe after a dislike:
- Include ONE natural sentence explaining why this shoe avoids the issue.
- Do this by referencing ride mechanics or design (e.g. wider base, more guidance, calmer foam, more stable transition).
- Write it as part of the shoe explanation, not as a labelled contrast or template.
- Do not restate the dislike itself as the cause. Explain the mechanism behind it.

If the cause of the dislike is genuinely unclear:
- Say so briefly.
- Ask ONE targeted clarifying question before recommending.

Nuance:
Terms like "bouncy" or "unstable" are not problems by themselves.
Focus on whether the sensation came from:
- uncontrolled rebound,
- a narrow or tall platform,
- lack of guidance,
- awkward transition,
- or stiffness that didn’t suit their running.
Avoid framing it as simply “more” or “less” bounce.

--------------------------------
8) INJURIES AND PAIN
--------------------------------
- Do not diagnose or prescribe treatment.
- If pain sounds persistent, worsening, or sharp, suggest seeing a physio. Otherwise keep it shoe-mechanics focused.
- If the user mentions knee pain, ankle instability, plantar issues, or "feels wobbly/unstable", treat stability as a priority even if they didn't ask for it.
- You may gently challenge them: explain why a more stable platform can reduce strain and feel better.
- Frame it as shoe-ride mechanics and comfort, not medical advice.
- If pain is mentioned, ask 1 supportive question about severity and whether they've seen a professional.
- You may suggest seeing a physio if pain is persistent or worsening, but do not turn the conversation into medical advice.
- Keep the focus on shoe properties that may help (stability, geometry, damping, fit).

--------------------------------
9) STYLE
--------------------------------
- Be clear and structured.
- Ask 2-5 high-signal questions when profiling. Ask 1-2 only if the user seems impatient or asked something narrow.
- Use short, direct sentences.
- If you have enough information, make the best call rather than delaying. Label assumptions clearly.
- Gently challenge suboptimal choices (e.g. carbon shoes for all runs). Educate without preaching.
- If you cannot find a match, say you don't have a clear match in the current catalogue and ask a clarifying question.
- Never open with "The X option is..." or "The most expensive option is...". Avoid robotic qualifiers like "in my database" unless the user asked about catalogue limits. Prefer a natural opener: "If you're saying no budget and long runs, I'd go for <shoe>."

Intent detection:
- If the user message is a greeting (e.g. "hello", "hi", "hey") OR informational (brand history, foams, injuries, blisters, gear care, etc.): do NOT recommend shoes. Respond naturally to the question. Optionally ask one light clarifying question if it feels natural.
- Only enter recommendation mode when the user is explicitly asking for shoe recommendations, OR implicitly asking for a recommendation (e.g. "any shoe suggestions?", "what would you pick?", "what should I run in?").

Education-first mode (orientation):
- If the user expresses confusion, uncertainty, or lack of familiarity with running or running shoes (e.g. "I'm new to running", "I don't know where to start", "I don't understand running shoes"), do NOT immediately recommend specific shoe models or begin calibration questioning.
- Start by orienting the user at a high level. Briefly explain the relevant concepts (e.g. why different types of running shoes exist) in simple, non-technical language. Build confidence and context before narrowing choices. Avoid jargon, niche terminology, or outdated categories.
- After providing orientation: gently guide the conversation towards understanding their goals. Only transition into calibration (Big 3 or other factors) once they show readiness or curiosity to choose a shoe.`;


    const runnerProfileContext = buildRunnerProfileContext(runnerProfile);

    // Get last user message
    const lastUserMessage = messages.filter((m: any) => m.role === "user").slice(-1)[0];
    const lastUserMessageText = lastUserMessage?.content || "";

    // Get last assistant message
    const lastAssistantMessage = [...messages].reverse().find((m: any) => m.role === "assistant");
    const lastAssistantText = String(lastAssistantMessage?.content ?? "");

    // Helper: detect affirmative replies
    function isAffirmativeReply(text: string): boolean {
      const trimmed = text.toLowerCase().trim().replace(/[.,!?]+$/g, "");
      // Match "yes", "yes please", "yeah go on", "ok sounds good", etc.
      return /^(yes|yeah|yep|sure|ok|okay|please)(\s+(please|thanks|thank you|go on|go ahead|sounds good|do it))?$/i.test(trimmed);
    }

    // Helper: detect if assistant invited recommendations
    function assistantInvitedRecs(text: string): boolean {
      const lower = text.toLowerCase();
      // Existing patterns
      if (lower.includes("ready for recommendations") ||
          lower.includes("want recommendations") ||
          lower.includes("want me to recommend") ||
          lower.includes("shall i recommend") ||
          lower.includes("would you like recommendations") ||
          lower.includes("would you like me to suggest") ||
          lower.includes("want some options") ||
          lower.includes("i can suggest")) {
        return true;
      }
      // Broader patterns
      if (lower.includes("would you like") && (lower.includes("recommend") || lower.includes("suggest") || lower.includes("options") || lower.includes("that"))) {
        return true;
      }
      if (lower.includes("shall i") && (lower.includes("recommend") || lower.includes("suggest"))) {
        return true;
      }
      if (lower.includes("want me to") && (lower.includes("recommend") || lower.includes("suggest"))) {
        return true;
      }
      return false;
    }

    // Helper: detect if user is asking to name the shoes
    function isAskingForNames(text: string): boolean {
      const lower = text.toLowerCase();
      return /what (shoes|trainers) are (those|these)/i.test(text) ||
        lower.includes("which ones") ||
        lower.includes("name them") ||
        /what are (they|those|these)/i.test(text) ||
        lower.includes("what models");
    }

    // Detect if user is requesting shoe recommendations
    const msgLower = lastUserMessageText.toLowerCase();
    const keywordMatch =
      msgLower.includes("recommend") ||
      msgLower.includes("recommendation") ||
      msgLower.includes("suggest") ||
      msgLower.includes("suggestion") ||
      msgLower.includes("what should i buy") ||
      msgLower.includes("what should i get") ||
      msgLower.includes("what should i run in") ||
      msgLower.includes("which shoe") ||
      msgLower.includes("which shoes") ||
      msgLower.includes("what do you recommend") ||
      ((msgLower.includes("pick") || msgLower.includes("choose") || msgLower.includes("decide")) &&
        (msgLower.includes("shoe") || msgLower.includes("shoes"))) ||
      (msgLower.includes("give me") &&
        (msgLower.includes("shoe") || msgLower.includes("shoes") || msgLower.includes("options"))) ||
      msgLower.includes("best shoe") ||
      msgLower.includes("best shoes");

    const userRequestedRecommendation =
      keywordMatch ||
      isAskingForNames(lastUserMessageText) ||
      (isAffirmativeReply(lastUserMessageText) && assistantInvitedRecs(lastAssistantText));

    console.log("[intent-detection] userRequestedRecommendation:", userRequestedRecommendation);

    // Check readiness: Big 3 + at least 3 extra signals
    const purpose = runnerProfile?.currentContext?.shoePurpose?.value;
    const width = runnerProfile?.profileCore?.footWidthVolume?.value;
    const stability = runnerProfile?.profileCore?.stabilityNeed?.value;

    const big3Known =
      purpose && String(purpose).trim().toLowerCase() !== "unknown" &&
      width && String(width).trim().toLowerCase() !== "unknown" &&
      stability && String(stability).trim().toLowerCase() !== "unknown";

    let extraSignalsCount = 0;
    if (runnerProfile?.profileCore?.experienceLevel?.value && String(runnerProfile.profileCore.experienceLevel.value).trim().toLowerCase() !== "unknown") extraSignalsCount++;
    if (Array.isArray(runnerProfile?.shoeFeedback?.likes) && runnerProfile.shoeFeedback.likes.length > 0) extraSignalsCount++;
    if (Array.isArray(runnerProfile?.shoeFeedback?.dislikes) && runnerProfile.shoeFeedback.dislikes.length > 0) extraSignalsCount++;
    if (runnerProfile?.currentContext?.surface?.value && String(runnerProfile.currentContext.surface.value).trim().toLowerCase() !== "unknown") extraSignalsCount++;
    if (runnerProfile?.currentContext?.weeklyMileage?.value && String(runnerProfile.currentContext.weeklyMileage.value).trim().toLowerCase() !== "unknown") extraSignalsCount++;
    if (runnerProfile?.currentContext?.runTypes?.value && String(runnerProfile.currentContext.runTypes.value).trim().toLowerCase() !== "unknown") extraSignalsCount++;
    if (runnerProfile?.profileCore?.feelPreference?.value && String(runnerProfile.profileCore.feelPreference.value).trim().toLowerCase() !== "unknown") extraSignalsCount++;
    if (runnerProfile?.profileCore?.budgetSensitivity?.value && String(runnerProfile.profileCore.budgetSensitivity.value).trim().toLowerCase() !== "unknown") extraSignalsCount++;
    if (runnerProfile?.profileCore?.painNiggles?.value && String(runnerProfile.profileCore.painNiggles.value).trim().toLowerCase() !== "unknown") extraSignalsCount++;

    // Cheap signals from lastUserMessageText
    if (/\b(soft|firm|cushion|cushioned|plush|harsh)\b/i.test(lastUserMessageText)) extraSignalsCount++;
    if (/\b(novablast|pegasus|bondi|clifton|ghost|nimbus|kayano|vomero|ultraboost|endorphin|kinvara|triumph|ride|tempus|guide|glycerin|invincible|alphafly|vaporfly|metaspeed|deviate)\b/i.test(lastUserMessageText)) extraSignalsCount++;

    const readyToRecommend = big3Known && extraSignalsCount >= 3;

    console.log("[readiness] big3Known:", big3Known, "| extraSignalsCount:", extraSignalsCount, "| readyToRecommend:", readyToRecommend);

    // Only get shortlist if we need it
    let shortlist: any[] = [];
    let shoeShortlistMessage = "";

    if (userRequestedRecommendation || readyToRecommend) {
      shortlist = getShortlist(runnerProfile, shoes, lastUserMessageText);
      console.log("[shoebase] shortlist size:", shortlist.length);
      console.log("[shoebase] first 3:", shortlist.slice(0, 3).map((s: any) => s.full_name));

      // Build shoe database shortlist message
      const shortlistShoes = shortlist.map((shoe: any) => ({
      full_name: shoe.full_name,
      shoe_category: shoe.shoe_category,
      support_type: shoe.support_type,
      use_daily: shoe.use_daily,
      use_easy_recovery: shoe.use_easy_recovery,
      use_long_run: shoe.use_long_run,
      use_tempo_workout: shoe.use_tempo_workout,
      use_race: shoe.use_race,
      use_trail: shoe.use_trail,
      cushion_softness_1to5: shoe.cushion_softness_1to5,
      bounce_1to5: shoe.bounce_1to5,
      stability_1to5: shoe.stability_1to5,
      rocker_1to5: shoe.rocker_1to5,
      ground_feel_1to5: shoe.ground_feel_1to5,
      weight_feel_1to5: shoe.weight_feel_1to5,
      has_plate: shoe.has_plate,
      plate_material: shoe.plate_material,
      weight_g: shoe.weight_g,
      heel_drop_mm: shoe.heel_drop_mm,
      retail_price_category: shoe.retail_price_category,
      release_year: shoe.release_year,
      release_quarter: shoe.release_quarter,
      release_status: shoe.release_status,
      why_it_feels_this_way: shoe.why_it_feels_this_way,
      avoid_if: shoe.avoid_if,
      similar_to: shoe.similar_to,
    }));

      const allowedModels = shortlist.map((s: any) => s.full_name);

      shoeShortlistMessage = `
ALLOWED_MODELS (you may ONLY mention these exact full_name strings):
${JSON.stringify(allowedModels, null, 2)}

RULES:
- You must ONLY output shoe model names that exactly match one of ALLOWED_MODELS (character-for-character).
- Do not mention any other shoe models, brands+models, or versions.
- You may mention shoe models the user explicitly mentioned earlier in this chat for context, but do not recommend them unless they are in ALLOWED_MODELS.
- Never output placeholders like "Shoe A".
- If none fit, say you don't have a confident match from the current catalogue and ask ONE clarifying question.

Shoe details for ALLOWED_MODELS:
${JSON.stringify(shortlistShoes, null, 2)}
`.trim();
    }

    const openAiMessages = [
      { role: "system", content: systemPrompt },
      ...(runnerProfileContext ? [{ role: "system", content: runnerProfileContext }] : []),
      ...(userRequestedRecommendation || readyToRecommend ? [{ role: "system", content: shoeShortlistMessage }] : []),
      ...messages.map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content ?? ""),
      })),
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: openAiMessages,
      temperature: 0.6,
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Sorry - I could not generate a response.";

    return res.status(200).json({ reply });
  } catch (e) {
    console.error("Chat API error:", e);
    return res.status(500).json({
      reply: "Sorry - I hit an error generating a response.",
    });
  }
}
