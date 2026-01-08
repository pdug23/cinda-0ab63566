// ============================================================================
// ANALYZE API ENDPOINT
// Orchestrates rotation analysis → gap detection → recommendations
// ============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { AnalyzeRequest, AnalyzeResponse, Shoe, Gap, RecommendedShoe } from './types';
import { analyzeRotation } from './lib/rotationAnalyzer';
import { identifyPrimaryGap } from './lib/gapDetector';
import { generateRecommendations, generateShoppingRecommendations } from './lib/recommendationEngine';
import shoebase from '../src/data/shoebase.json';

/**
 * Main handler for /api/analyze endpoint
 * Supports three modes: gap_detection, shopping, analysis
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

    const { profile, currentShoes, mode, constraints } = body as AnalyzeRequest;

    // Log request for debugging
    console.log('[analyze] Request:', {
      mode,
      profileGoal: profile.primaryGoal,
      profileExperience: profile.experience,
      currentShoesCount: currentShoes.length,
      hasConstraints: !!constraints,
    });

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
      const gap = identifyPrimaryGap(analysis, profile, currentShoes, catalogue);

      console.log('[analyze] Gap identified:', {
        type: gap.type,
        severity: gap.severity,
        missingCapability: gap.missingCapability,
      });

      const elapsed = Date.now() - startTime;
      console.log('[analyze] Gap detection complete. Elapsed time:', elapsed, 'ms');

      res.status(200).json({
        success: true,
        mode: "gap_detection",
        result: { gap },
      } as AnalyzeResponse);
      return;
    }

    // =========================================================================
    // 4. MODE: SHOPPING
    // =========================================================================

    if (mode === "shopping") {
      console.log('[analyze] Mode: Shopping');

      const { shoeRequests } = body as AnalyzeRequest;

      if (!shoeRequests || shoeRequests.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Shopping mode requires at least one shoe request',
        } as AnalyzeResponse);
        return;
      }

      if (shoeRequests.length > 3) {
        res.status(400).json({
          success: false,
          error: 'Shopping mode supports a maximum of 3 shoe requests',
        } as AnalyzeResponse);
        return;
      }

      console.log('[analyze] Processing', shoeRequests.length, 'shoe requests');

      const shoppingResults = shoeRequests.map((request, index) => {
        console.log(`[analyze] Request ${index + 1}: ${request.role} shoes`);

        try {
          const recommendations = generateShoppingRecommendations(
            request,
            profile,
            currentShoes,
            catalogue
          );

          // Helper to describe feel preference
          const describePreference = (pref: number | number[], soft: string, firm: string, balanced: string) => {
            if (Array.isArray(pref)) {
              const avg = pref.reduce((a, b) => a + b, 0) / pref.length;
              if (avg >= 4) return soft;
              if (avg <= 2) return firm;
              return balanced;
            }
            if (pref >= 4) return soft;
            if (pref <= 2) return firm;
            return balanced;
          };

          const reasoning = `Based on your preference for ${request.role} shoes with ${
            describePreference(request.feelPreferences.softVsFirm, 'soft', 'firm', 'balanced')
          } cushion, ${
            describePreference(request.feelPreferences.bouncyVsDamped, 'bouncy', 'damped', 'moderate')
          } response, and ${
            describePreference(request.feelPreferences.stableVsNeutral, 'stable', 'neutral', 'balanced')
          } platform.`;

          return {
            role: request.role,
            recommendations,
            reasoning,
          };
        } catch (error: any) {
          console.error(`[analyze] Shopping request ${index + 1} failed:`, error.message);
          throw new Error(`Failed to generate recommendations for ${request.role}: ${error.message}`);
        }
      });

      const elapsed = Date.now() - startTime;
      console.log('[analyze] Shopping mode complete. Elapsed time:', elapsed, 'ms');

      res.status(200).json({
        success: true,
        mode: "shopping",
        result: { shoppingResults },
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
        missingCapability: gap.missingCapability,
      });

      let recommendations;
      try {
        recommendations = generateRecommendations(
          gap,
          profile,
          currentShoes,
          catalogue,
          feelPreferences
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

      const elapsed = Date.now() - startTime;
      console.log('[analyze] Analysis mode complete. Elapsed time:', elapsed, 'ms');

      res.status(200).json({
        success: true,
        mode: "analysis",
        result: {
          gap,
          recommendations,
          summaryReasoning,
        },
      } as AnalyzeResponse);
      return;
    }

    // =========================================================================
    // 6. INVALID MODE
    // =========================================================================

    res.status(400).json({
      success: false,
      error: `Invalid mode: ${mode}. Supported modes: gap_detection, shopping, analysis`,
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

  switch (gap.type) {
    case 'coverage':
      if (gap.missingCapability && gap.missingCapability !== 'rotation variety') {
        if (allMaxCushion) {
          summary += `I've recommended ${recCount} cushioned options for ${gap.missingCapability as string} runs from ${brands}.`;
        } else if (allPlated) {
          summary += `I've recommended ${recCount} plated shoes perfect for ${gap.missingCapability as string} work from ${brands}.`;
        } else {
          summary += `I've recommended ${recCount} shoes to cover ${gap.missingCapability as string} runs from ${brands}.`;
        }
      } else {
        summary += `Here are ${recCount} versatile options to expand your rotation: ${brands}.`;
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
  const tradeOff = recommendations.find((r: RecommendedShoe) => r.recommendationType === 'trade_off_option');
  if (tradeOff && tradeOff.tradeOffs) {
    summary += ` Note: ${tradeOff.fullName} offers a different approach but ${tradeOff.tradeOffs.toLowerCase()}.`;
  }

  return summary;
}
