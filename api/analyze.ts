// ============================================================================
// ANALYZE API ENDPOINT
// Orchestrates rotation analysis → gap detection → recommendations
// Updated for archetype-based model
// ============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  Shoe,
  Gap,
  RecommendedShoe,
  RotationSummary
} from './types.js';
import { analyzeRotation, calculateRotationHealth } from './lib/rotationAnalyzer.js';
import { identifyPrimaryGap } from './lib/gapDetector.js';
import { generateRecommendations, generateDiscoveryRecommendations } from './lib/recommendationEngine.js';
import { getShoeCapabilities, detectMisuse } from './lib/shoeCapabilities.js';
import { classifyRotationTier } from './lib/tierClassifier.js';
import shoebase from '../src/data/shoebase.json' with { type: "json" };

/**
 * Main handler for /api/analyze endpoint
 * Supports three modes: gap_detection, discovery, analysis
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Enable CORS for development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Validate HTTP method
  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
    } as AnalyzeResponse);
    return;
  }

  try {
    // =========================================================================
    // 1. VALIDATE REQUEST
    // =========================================================================

    const body = req.body as Partial<AnalyzeRequest>;

    if (!body.profile || !Array.isArray(body.currentShoes) || !body.mode) {
      res.status(400).json({
        success: false,
        error: 'Invalid request body. Required: profile, currentShoes (array), mode.',
      } as AnalyzeResponse);
      return;
    }

    const { profile, constraints, chatContext } = body as AnalyzeRequest;

    // =========================================================================
    // 1b. BACKWARDS COMPATIBILITY NORMALIZATION
    // =========================================================================

    // Normalize mode: "shopping" → "discovery"
    let mode = body.mode as string;
    if (mode === "shopping") {
      mode = "discovery";
      console.log('[analyze] Normalized mode: shopping → discovery');
    }

    // Normalize currentShoes: convert legacy "roles" to "runTypes"
    const rawShoes = body.currentShoes as any[];
    const currentShoes = rawShoes.map(shoe => {
      // If shoe has "roles" but not "runTypes", convert
      if (shoe.roles && !shoe.runTypes) {
        // Map legacy role values to new runType values
        const roleToRunType: Record<string, string> = {
          "easy": "recovery",
          "daily": "all_runs",
          "long": "long_runs",
          "tempo": "workouts",
          "intervals": "workouts",
          "race": "races",
          "trail": "trail"
        };
        const runTypes = shoe.roles.map((role: string) => roleToRunType[role] || role);
        return { ...shoe, runTypes, roles: undefined };
      }
      // Also normalize "all_my_runs" to "all_runs"
      if (shoe.runTypes) {
        const normalizedRunTypes = shoe.runTypes.map((rt: string) =>
          rt === "all_my_runs" ? "all_runs" : rt
        );
        return { ...shoe, runTypes: normalizedRunTypes };
      }
      return shoe;
    });

    // Log request for debugging
    console.log('[analyze] Request:', {
      mode,
      profileGoal: profile.primaryGoal,
      profileExperience: profile.experience,
      currentShoesCount: currentShoes.length,
      hasConstraints: !!constraints,
    });

    // DEBUG: Log full profile data for modifier debugging
    console.log('[analyze] DEBUG - Full profile:', {
      experience: profile.experience,
      primaryGoal: profile.primaryGoal,
      runningPattern: profile.runningPattern,
      footStrike: profile.footStrike,
      raceTime: profile.raceTime,
      height: profile.height,
      weight: profile.weight,
      trailRunning: profile.trailRunning,
      brandPreference: profile.brandPreference,
    });

    // DEBUG: Log currentShoes with sentiment/tags
    console.log('[analyze] DEBUG - CurrentShoes:', currentShoes.map(s => ({
      shoeId: s.shoeId,
      sentiment: s.sentiment,
      loveTags: s.loveTags,
      dislikeTags: s.dislikeTags,
      runTypes: s.runTypes,
    })));

    // DEBUG: Log chatContext
    console.log('[analyze] DEBUG - ChatContext:', chatContext);

    // =========================================================================
    // 2. LOAD CATALOGUE
    // =========================================================================

    const catalogue = shoebase as Shoe[];

    if (!catalogue || catalogue.length === 0) {
      console.error('[analyze] Catalogue validation failed');
      res.status(500).json({
        success: false,
        error: 'Shoe catalogue unavailable',
      } as AnalyzeResponse);
      return;
    }

    console.log('[analyze] Catalogue loaded:', catalogue.length, 'shoes');

    const startTime = Date.now();

    // =========================================================================
    // 3. MODE: GAP DETECTION ONLY
    // =========================================================================

    if (mode === "gap_detection") {
      console.log('[analyze] Mode: Gap Detection');

      const analysis = analyzeRotation(currentShoes, profile, catalogue);
      
      const health = calculateRotationHealth(currentShoes, profile, catalogue);
      console.log('[analyze] Rotation health:', health);
      
      const tierResult = classifyRotationTier(health, analysis, profile, currentShoes, catalogue);
      console.log('[analyze] Tier classification:', tierResult);
            
      const gap = identifyPrimaryGap(analysis, profile, currentShoes, catalogue);

      console.log('[analyze] Gap identified:', {
        type: gap.type,
        severity: gap.severity,
        recommendedArchetype: gap.recommendedArchetype,
      });

      // Build rotation summary
      const rotationSummary = currentShoes.map(cs => {
        const shoe = catalogue.find(s => s.shoe_id === cs.shoeId);
        if (!shoe) return null;

        const archetypes = getShoeCapabilities(shoe);
        const misuse = detectMisuse(cs.runTypes, archetypes, shoe);

        return {
          shoe: shoe,
          userRunTypes: cs.runTypes,
          archetypes,
          misuseLevel: misuse.level,
          misuseMessage: misuse.message
        } as RotationSummary;
      }).filter((item): item is RotationSummary => item !== null);

      const elapsed = Date.now() - startTime;
      console.log('[analyze] Gap detection complete. Elapsed time:', elapsed, 'ms');

      res.status(200).json({
        success: true,
        mode: "gap_detection",
        result: {
          gap,
          rotationSummary
        },
      } as AnalyzeResponse);
      return;
    }

    // =========================================================================
    // 4. MODE: DISCOVERY (was SHOPPING)
    // =========================================================================

    if (mode === "discovery") {
      console.log('[analyze] Mode: Discovery');

      const { shoeRequests: rawShoeRequests, requestedArchetypes } = body as any;

      // Handle either shoeRequests (detailed) or requestedArchetypes (simple)
      if ((!rawShoeRequests || rawShoeRequests.length === 0) && (!requestedArchetypes || requestedArchetypes.length === 0)) {
        res.status(400).json({
          success: false,
          error: 'Discovery mode requires either shoeRequests or requestedArchetypes',
        } as AnalyzeResponse);
        return;
      }

      // Map legacy role values to archetype values
      const roleToArchetype: Record<string, string> = {
        "daily_trainer": "daily_trainer",
        "recovery": "recovery_shoe",
        "tempo": "workout_shoe",
        "race_day": "race_shoe",
        "trail": "trail_shoe",
        "not_sure": "daily_trainer"
      };

      // Default feel preferences for when frontend doesn't send them
      const defaultFeelPreferences = {
        cushionAmount: { mode: 'cinda_decides' as const },
        stabilityAmount: { mode: 'cinda_decides' as const },
        energyReturn: { mode: 'cinda_decides' as const },
        rocker: { mode: 'cinda_decides' as const },
        groundFeel: { mode: 'cinda_decides' as const },
        heelDropPreference: { mode: 'cinda_decides' as const }
      };

      // Normalize shoeRequests: convert "role" to "archetype" and ensure feelPreferences exists
      const normalizedShoeRequests = rawShoeRequests?.map((req: any) => {
        let archetype = req.archetype;

        // If request has "role" but not "archetype", convert
        if (req.role && !archetype) {
          archetype = roleToArchetype[req.role] || "daily_trainer";
          console.log(`[analyze] Normalized role: ${req.role} → ${archetype}`);
        }

        // Ensure feelPreferences exists with defaults for any missing properties
        const feelPreferences = {
          ...defaultFeelPreferences,
          ...(req.feelPreferences || {})
        };

        // Normalize each preference to ensure it has a mode property
        const normalizePreference = (pref: any) => {
          if (!pref) return { mode: 'cinda_decides' };
          if (typeof pref === 'object' && pref.mode) return pref;
          if (typeof pref === 'number') return { mode: 'user_set', value: pref };
          return { mode: 'cinda_decides' };
        };

        return {
          ...req,
          archetype,
          role: undefined,
          feelPreferences: {
            cushionAmount: normalizePreference(feelPreferences.cushionAmount),
            stabilityAmount: normalizePreference(feelPreferences.stabilityAmount),
            energyReturn: normalizePreference(feelPreferences.energyReturn),
            rocker: normalizePreference(feelPreferences.rocker),
            groundFeel: normalizePreference(feelPreferences.groundFeel),
            heelDropPreference: normalizePreference(feelPreferences.heelDropPreference)
          }
        };
      });

      // Convert simple requestedArchetypes to shoeRequests if needed
      const effectiveRequests = normalizedShoeRequests || requestedArchetypes!.map((archetype: string) => ({
        archetype,
        feelPreferences: {
          cushionAmount: { mode: 'cinda_decides' as const },
          stabilityAmount: { mode: 'cinda_decides' as const },
          energyReturn: { mode: 'cinda_decides' as const },
          rocker: { mode: 'cinda_decides' as const },
          groundFeel: { mode: 'cinda_decides' as const },
          heelDropPreference: { mode: 'cinda_decides' as const }
        }
      }));

      if (effectiveRequests.length > 3) {
        res.status(400).json({
          success: false,
          error: 'Discovery mode supports a maximum of 3 archetype requests',
        } as AnalyzeResponse);
        return;
      }

      console.log('[analyze] Processing', effectiveRequests.length, 'archetype requests');

      // Process each request
      const discoveryResults = await Promise.all(effectiveRequests.map(async (request: any, index: number) => {
        console.log(`[analyze] Request ${index + 1}: ${request.archetype} shoes`);

        try {
          const recommendations = await generateDiscoveryRecommendations(
            request,
            profile,
            currentShoes,
            catalogue,
            chatContext
          );

          // Helper to describe preference value for reasoning text
          const describePref = (pref: { mode: string; value?: number }, labels: [string, string, string]): string => {
            const [low, mid, high] = labels;
            if (pref.mode === 'wildcard') return 'flexible';
            if (pref.mode === 'cinda_decides') return 'balanced';
            const val = pref.value ?? 3;
            if (val <= 2) return low;
            if (val >= 4) return high;
            return mid;
          };

          const cushion = describePref(request.feelPreferences.cushionAmount, ['minimal', 'balanced', 'max']);
          const bounce = describePref(request.feelPreferences.energyReturn, ['damped', 'moderate', 'bouncy']);
          const stability = describePref(request.feelPreferences.stabilityAmount, ['neutral', 'balanced', 'stable']);

          const archetypeLabel = request.archetype.replace('_', ' ');
          const reasoning = `Based on your preference for a ${archetypeLabel} with ${cushion} cushion, ${bounce} response, and ${stability} platform.`;

          return {
            archetype: request.archetype,
            recommendations,
            reasoning,
          };
        } catch (error: any) {
          console.error(`[analyze] Discovery request ${index + 1} failed:`, error.message);
          throw new Error(`Failed to generate recommendations for ${request.archetype}: ${error.message}`);
        }
      }));

      const elapsed = Date.now() - startTime;
      console.log('[analyze] Discovery mode complete. Elapsed time:', elapsed, 'ms');

      res.status(200).json({
        success: true,
        mode: "discovery",
        result: { discoveryResults },
      } as AnalyzeResponse);
      return;
    }

    // =========================================================================
    // 5. MODE: ANALYSIS
    // =========================================================================

    if (mode === "analysis") {
      console.log('[analyze] Mode: Analysis');

      const { gap, feelPreferences } = body as AnalyzeRequest;

      if (!gap) {
        res.status(400).json({
          success: false,
          error: 'Analysis mode requires a gap from prior gap_detection call',
        } as AnalyzeResponse);
        return;
      }

      if (!feelPreferences) {
        res.status(400).json({
          success: false,
          error: 'Analysis mode requires feelPreferences for the identified gap',
        } as AnalyzeResponse);
        return;
      }

      console.log('[analyze] Gap:', {
        type: gap.type,
        severity: gap.severity,
        recommendedArchetype: gap.recommendedArchetype,
      });

      let recommendations;
      try {
        recommendations = await generateRecommendations(
          gap,
          profile,
          currentShoes,
          catalogue,
          feelPreferences,
          chatContext
        );
      } catch (error: any) {
        console.error('[analyze] Recommendation generation failed:', error.message);
        res.status(500).json({
          success: false,
          error: `Could not generate recommendations: ${error.message}`,
        } as AnalyzeResponse);
        return;
      }

      // Validate we got exactly 3 recommendations
      if (recommendations.length !== 3) {
        console.error('[analyze] Invalid recommendation count:', recommendations.length);
        res.status(500).json({
          success: false,
          error: 'Could not generate 3 recommendations. Try relaxing constraints.',
        } as AnalyzeResponse);
        return;
      }

      console.log('[analyze] Recommendations generated:',
        recommendations.map(r => `${r.fullName} (${r.recommendationType})`)
      );

      const summaryReasoning = buildSummaryReasoning(gap, recommendations);

      // Build rotation summary for analysis mode
      const rotationSummary = currentShoes.map(cs => {
        const shoe = catalogue.find(s => s.shoe_id === cs.shoeId);
        if (!shoe) return null;

        const archetypes = getShoeCapabilities(shoe);
        const misuse = detectMisuse(cs.runTypes, archetypes, shoe);

        return {
          shoe,
          userRunTypes: cs.runTypes,
          archetypes,
          misuseLevel: misuse.level,
          misuseMessage: misuse.message
        } as RotationSummary;
      }).filter((item): item is RotationSummary => item !== null);

      const elapsed = Date.now() - startTime;
      console.log('[analyze] Analysis mode complete. Elapsed time:', elapsed, 'ms');

      res.status(200).json({
        success: true,
        mode: "analysis",
        result: {
          gap,
          recommendations,
          summaryReasoning,
          rotationSummary,
        },
      } as AnalyzeResponse);
      return;
    }

    // =========================================================================
    // 6. INVALID MODE
    // =========================================================================

    res.status(400).json({
      success: false,
      error: `Invalid mode: ${mode}. Supported modes: gap_detection, discovery, analysis`,
    } as AnalyzeResponse);

  } catch (error: any) {
    // =========================================================================
    // CATCH-ALL ERROR HANDLER
    // =========================================================================

    console.error('[analyze] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error. Please try again.',
    } as AnalyzeResponse);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build summary reasoning (2-3 sentences combining gap + recommendations)
 */
function buildSummaryReasoning(
  gap: Gap,
  recommendations: RecommendedShoe[]
): string {
  const recCount = recommendations.length;
  const brandSet = new Set(recommendations.map((r: RecommendedShoe) => r.brand));
  const brands = Array.from(brandSet).join(', ');

  // Extract common attributes
  const allPlated = recommendations.every((r: RecommendedShoe) => r.has_plate);
  const allMaxCushion = recommendations.every((r: RecommendedShoe) => r.cushion_softness_1to5 >= 4);
  const avgWeight = Math.round(
    recommendations.reduce((sum: number, r: RecommendedShoe) => sum + r.weight_g, 0) / recCount
  );

  // Build summary based on gap type
  let summary = gap.reasoning + ' ';
  const archetypeLabel = gap.recommendedArchetype?.replace('_', ' ') || 'your needs';

  switch (gap.type) {
    case 'coverage':
    case 'misuse':
      if (allMaxCushion) {
        summary += `I've recommended ${recCount} cushioned options for ${archetypeLabel} from ${brands}.`;
      } else if (allPlated) {
        summary += `I've recommended ${recCount} plated shoes perfect for ${archetypeLabel} from ${brands}.`;
      } else {
        summary += `I've recommended ${recCount} shoes to cover ${archetypeLabel} from ${brands}.`;
      }
      break;

    case 'performance':
      if (allPlated) {
        summary += `All ${recCount} recommendations feature carbon plates for maximum speed: ${brands}.`;
      } else {
        summary += `I've recommended ${recCount} responsive trainers (avg ${avgWeight}g) from ${brands}.`;
      }
      break;

    case 'recovery':
      summary += `These ${recCount} max-cushion shoes from ${brands} will protect your legs on easy days.`;
      break;

    case 'redundancy':
      summary += `These ${recCount} options from ${brands} would diversify your rotation without overlap.`;
      break;

    default:
      summary += `Here are ${recCount} top picks from ${brands}.`;
  }

  // Add trade-off note
  const tradeOff = recommendations.find((r: RecommendedShoe) => r.recommendationType === 'trade_off');
  if (tradeOff && tradeOff.tradeOffs && tradeOff.tradeOffs.length > 0) {
    const tradeOffText = tradeOff.tradeOffs.join(', ').toLowerCase();
    summary += ` Note: ${tradeOff.fullName} offers a different approach but ${tradeOffText}.`;
  }

  return summary;
}
