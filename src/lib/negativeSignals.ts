import type {
  RunnerProfile,
  NegativeReasonTag,
  Severity,
  ShoePurpose,
  ShoeFeedbackItem,
} from "@/lib/runnerProfile";

const nowIso = () => new Date().toISOString();

const normalise = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const hasNegatedPattern = (textNorm: string, word: string) => {
  // Matches: "not too soft", "not overly soft", "isn't too soft", "isnt too soft"
  const re = new RegExp(`\\b(not|isn\\s*t|isnt)\\s+(too\\s+|overly\\s+|that\\s+)?${word}\\b`);
  return re.test(textNorm);
};

const hasGeneralisationCue = (textNorm: string) => {
  // Signals that the user is talking about a brand in general, not one model
  return (
    textNorm.includes("in general") ||
    textNorm.includes("as a brand") ||
    textNorm.includes("always") ||
    textNorm.includes("every time") ||
    textNorm.includes("often") ||
    textNorm.includes("usually") ||
    textNorm.includes("tend to") ||
    textNorm.includes("generally") ||
    textNorm.includes("never again") ||
    textNorm.includes("doesnt work for me") ||
    textNorm.includes("doesn't work for me") ||
    textNorm.includes("dont get on with") ||
    textNorm.includes("don't get on with") ||
    textNorm.includes("just doesnt work") ||
    textNorm.includes("just doesn't work") ||
    textNorm.includes("any ") ||
    textNorm.includes("all ")
  );
};

const BRAND_LIST = [
  "nike",
  "adidas",
  "hoka",
  "new balance",
  "mizuno",
  "salomon",
  "skechers",
  "puma",
];

function detectSeverity(textNorm: string): Severity {
  if (textNorm.includes("never again") || textNorm.includes("hate") || textNorm.includes("hated")) return 3;
  if (textNorm.includes("didnt like") || textNorm.includes("didn't like") || textNorm.includes("not for me")) return 2;
  return 1;
}

function detectReasonTags(textNorm: string): NegativeReasonTag[] {
  const tags: NegativeReasonTag[] = [];

  if (textNorm.includes("too firm") && !hasNegatedPattern(textNorm, "firm")) tags.push("too_firm");
  if (textNorm.includes("too soft") && !hasNegatedPattern(textNorm, "soft")) tags.push("too_soft");
  if (
    (textNorm.includes("too bouncy") || textNorm.includes("trampoline")) &&
    !hasNegatedPattern(textNorm, "bouncy")
  ) {
    tags.push("too_bouncy");
  }
  if (textNorm.includes("mushy")) tags.push("too_mushy");
  if (textNorm.includes("dead") || textNorm.includes("no pop")) tags.push("too_dead");
  if (textNorm.includes("too stiff")) tags.push("too_stiff");
  if (textNorm.includes("too flexible") || textNorm.includes("floppy")) tags.push("too_flexible");

  if (textNorm.includes("unstable") || textNorm.includes("wobbly") || textNorm.includes("tippy")) tags.push("too_unstable");

  if (textNorm.includes("heel slip") || (textNorm.includes("heel") && textNorm.includes("slip"))) tags.push("heel_slip");
  if ((textNorm.includes("toe box") || textNorm.includes("toebox")) && (textNorm.includes("narrow") || textNorm.includes("cramped")))
    tags.push("toe_box_too_narrow");
  if (textNorm.includes("midfoot") && textNorm.includes("narrow")) tags.push("midfoot_too_narrow");
  if (textNorm.includes("arch") && (textNorm.includes("pressure") || textNorm.includes("pain"))) tags.push("arch_pressure");

  if (textNorm.includes("blister") || textNorm.includes("hotspot") || textNorm.includes("rubbed")) tags.push("blisters_hotspots");

  if (textNorm.includes("runs small") || textNorm.includes("too small")) tags.push("runs_short");
  if (textNorm.includes("runs big") || textNorm.includes("too big")) tags.push("runs_long");

  return Array.from(new Set(tags));
}

function detectBrandGeneralisation(textNorm: string, shoeMatched: boolean): string | null {
  for (const brand of BRAND_LIST) {
    if (!textNorm.includes(brand)) continue;

    const hasExplicitGeneralNeg =
      textNorm.includes("dont like") ||
      textNorm.includes("don't like") ||
      textNorm.includes("hate") ||
      textNorm.includes("hated") ||
      textNorm.includes("doesnt work") ||
      textNorm.includes("doesn't work") ||
      textNorm.includes("never again");

    // If we have a shoe match, only treat it as a brand-level negative signal
    // when the user clearly generalises (always, in general, every time, etc).
    if (shoeMatched) {
      if (hasExplicitGeneralNeg && hasGeneralisationCue(textNorm)) return brand;
      continue;
    }

    // If no shoe was matched, allow a brand-level dislike if they clearly express it.
    if (hasExplicitGeneralNeg && hasGeneralisationCue(textNorm)) return brand;
  }

  return null;
}

function detectCuratedShoe(
  textNorm: string,
  curated: string[]
): { display: string; confidence: "high" | "medium" } | null {
  for (const name of curated) {
    const n = normalise(name);
    if (textNorm.includes(n)) return { display: name, confidence: "high" };
  }

  for (const name of curated) {
    const n = normalise(name);
    const tokens = n.split(" ").filter(t => t.length >= 4);
    const hits = tokens.filter(tok => textNorm.includes(tok)).length;
    if (hits >= 2) return { display: name, confidence: "medium" };
  }

  return null;
}

function deriveBrandFromDisplay(display: string): string | null {
  const d = normalise(display);
  if (d.startsWith("new balance")) return "New Balance";
  return display.split(" ")[0] ?? null;
}

function upsertFeature(
  profile: RunnerProfile,
  tag: NegativeReasonTag,
  strength: Severity,
  context?: ShoePurpose | null,
  raw?: string
) {
  const existing = profile.negativeSignals.features.find(f => f.tag === tag);
  const contexts = context ? [context] : undefined;

  if (!existing) {
    profile.negativeSignals.features.push({
      tag,
      strength,
      contexts,
      updatedAt: nowIso(),
      raw: raw ?? null,
    });
    return;
  }

  existing.strength = Math.max(existing.strength, strength) as Severity;
  existing.updatedAt = nowIso();
  if (raw) existing.raw = raw;

  if (contexts) {
    const prev = Array.isArray(existing.contexts) ? existing.contexts : [];
    existing.contexts = Array.from(new Set([...prev, ...contexts]));
  }
}

function upsertBrand(profile: RunnerProfile, brand: string, strength: Severity, raw?: string) {
  const key = normalise(brand);
  const existing = profile.negativeSignals.brands.find(b => normalise(b.brand) === key);

  if (!existing) {
    profile.negativeSignals.brands.push({
      brand,
      strength,
      updatedAt: nowIso(),
      raw: raw ?? null,
    });
    return;
  }

  existing.strength = Math.max(existing.strength, strength) as Severity;
  existing.updatedAt = nowIso();
  if (raw) existing.raw = raw;
}

function upsertShoeDislike(profile: RunnerProfile, item: ShoeFeedbackItem) {
  const key = normalise(item.display_name ?? item.canonical_model ?? item.raw_text);
  const existing = profile.shoeFeedback.dislikes.find(
    d => normalise(d.display_name ?? d.canonical_model ?? d.raw_text) === key
  );

  if (!existing) {
    profile.shoeFeedback.dislikes.push(item);
    return;
  }

  existing.updatedAt = nowIso();
  existing.severity = Math.max(existing.severity, item.severity) as Severity;
  existing.match_confidence = existing.match_confidence === "high" ? "high" : item.match_confidence;

  const merged = Array.from(new Set([...(existing.reasons ?? []), ...(item.reasons ?? [])]));
  existing.reasons = merged as NegativeReasonTag[];
}

export function applyNegativeSignals(params: {
  runnerProfile: RunnerProfile;
  userText: string;
  curatedShoeNames: string[];
}) {
  const { runnerProfile, userText, curatedShoeNames } = params;

  const textNorm = normalise(userText);
  const severity = detectSeverity(textNorm);
  const reasonTags = detectReasonTags(textNorm);
  const shoe = detectCuratedShoe(textNorm, curatedShoeNames);

  const hasNegativeVerb =
    textNorm.includes("hate") ||
    textNorm.includes("hated") ||
    textNorm.includes("dislike") ||
    textNorm.includes("didnt like") ||
    textNorm.includes("didn't like") ||
    textNorm.includes("not for me") ||
    textNorm.includes("never again");

  // Only proceed if there is genuine negative content
  if (!hasNegativeVerb && reasonTags.length === 0 && !shoe) return runnerProfile;

  for (const tag of reasonTags) {
    upsertFeature(runnerProfile, tag, severity, runnerProfile.currentContext.shoePurpose.value, userText);
  }

  const brand = detectBrandGeneralisation(textNorm, Boolean(shoe));
  if (brand) {
    upsertBrand(runnerProfile, brand, severity, userText);
  }

  // Only log a shoe dislike when the message is actually negative (verb or reasons)
  if (shoe && (hasNegativeVerb || reasonTags.length > 0)) {
    upsertShoeDislike(runnerProfile, {
      raw_text: userText,
      display_name: shoe.display,
      brand: deriveBrandFromDisplay(shoe.display),
      canonical_model: shoe.display,
      version: null,
      reasons: reasonTags,
      match_confidence: shoe.confidence,
      severity,
      updatedAt: nowIso(),
    });
  }

  return runnerProfile;
}
