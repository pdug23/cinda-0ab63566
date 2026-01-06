// ============================================================================
// ANALYZE API ENDPOINT
// Orchestrates rotation analysis → gap detection → recommendations
// ============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { AnalyzeRequest, AnalyzeResponse, Shoe, Gap, RecommendedShoe } from './types';
import { analyzeRotation } from './lib/rotationAnalyzer';
import { identifyPrimaryGap } from './lib/gapDetector';
import { generateRecommendations } from './lib/recommendationEngine';
import shoebase from '../src/data/shoebase.json';

/**
 * Main handler for /api/analyze endpoint
 * Takes runner profile + current shoes, returns gap + 3 recommendations
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

    if (!body.profile || !Array.isArray(body.currentShoes) || !body.intent) {
      res.status(400).json({
        success: false,
        error: 'Invalid request body. Required: profile, currentShoes (array), intent.',
      } as AnalyzeResponse);
      return;
    }

    const { profile, currentShoes, intent, constraints } = body as AnalyzeRequest;

    // Log request for debugging
    console.log('[analyze] Request:', {
      profileGoal: profile.primaryGoal,
      profileExperience: profile.experience,
      currentShoesCount: currentShoes.length,
      intent,
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

    // =========================================================================
    // 3. ANALYZE ROTATION
    // =========================================================================

    const startTime = Date.now();

    const analysis = analyzeRotation(currentShoes, profile, catalogue);

    console.log('[analyze] Rotation analyzed:', {
      coveredRoles: analysis.coveredRoles,
      missingRoles: analysis.missingRoles,
      redundancyCount: analysis.redundancies.length,
      allShoesLiked: analysis.allShoesLiked,
    });

    // =========================================================================
    // 4. IDENTIFY PRIMARY GAP
    // =========================================================================

    const gap = identifyPrimaryGap(analysis, profile, currentShoes, catalogue);

    console.log('[analyze] Gap identified:', {
      type: gap.type,
      severity: gap.severity,
      missingCapability: gap.missingCapability,
    });

    // =========================================================================
    // 5. GENERATE RECOMMENDATIONS
    // =========================================================================

    let recommendations;
    try {
      recommendations = generateRecommendations(gap, profile, currentShoes, catalogue);
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

    // =========================================================================
    // 6. BUILD SUMMARY REASONING
    // =========================================================================

    const summaryReasoning = buildSummaryReasoning(gap, recommendations);

    // =========================================================================
    // 7. RETURN SUCCESS RESPONSE
    // =========================================================================

    const elapsed = Date.now() - startTime;
    console.log('[analyze] Success. Elapsed time:', elapsed, 'ms');

    res.status(200).json({
      success: true,
      result: {
        gap,
        recommendations,
        summaryReasoning,
      },
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
