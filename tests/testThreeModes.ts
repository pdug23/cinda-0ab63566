// ============================================================================
// THREE-MODE RECOMMENDATION ENGINE TEST HARNESS
// Tests gap_detection, shopping, and analysis modes
// ============================================================================

import { analyzeRotation } from '../api/lib/rotationAnalyzer';
import { identifyPrimaryGap } from '../api/lib/gapDetector';
import { generateRecommendations, generateShoppingRecommendations } from '../api/lib/recommendationEngine';
import type {
  RunnerProfile,
  CurrentShoe,
  Shoe,
  Gap,
  ShoeRequest,
  FeelPreferences,
  RecommendedShoe
} from '../api/types';
import shoebase from '../src/data/shoebase.json';

const catalogue = shoebase as Shoe[];

// ============================================================================
// TEST UTILITIES
// ============================================================================

function validateShoesExist(recommendations: RecommendedShoe[]): boolean {
  return recommendations.every(rec =>
    catalogue.some(shoe => shoe.shoe_id === rec.shoeId)
  );
}

function logTestHeader(testName: string, description: string) {
  console.log('-'.repeat(80));
  console.log(`${testName}`);
  console.log(`Description: ${description}`);
  console.log('-'.repeat(80));
}

function logSuccess(testName: string) {
  console.log('');
  console.log(`✓ ${testName} PASSED`);
  console.log('');
}

function logFailure(testName: string, error: string) {
  console.log('');
  console.log(`✗ ${testName} FAILED`);
  console.log(`  Error: ${error}`);
  console.log('');
}

// ============================================================================
// MODE 1: GAP DETECTION TESTS
// ============================================================================

function testGapDetectionMode() {
  const testName = 'Test 1: Gap Detection Mode';
  const description = 'Analyze rotation and return primary gap (no recommendations)';

  logTestHeader(testName, description);

  try {
    const profile: RunnerProfile = {
      firstName: 'Alex',
      experience: 'intermediate',
      primaryGoal: 'improve_pace',
    };

    const currentShoes: CurrentShoe[] = [
      {
        shoeId: 'nike_pegasus_41',
        roles: ['daily'],
        sentiment: 'like',
      },
    ];

    // Simulate gap_detection mode
    const analysis = analyzeRotation(currentShoes, profile, catalogue);
    const gap = identifyPrimaryGap(analysis, profile, currentShoes, catalogue);

    console.log('');
    console.log('RESULTS:');
    console.log(`  Gap Type: ${gap.type}`);
    console.log(`  Gap Severity: ${gap.severity}`);
    console.log(`  Missing Capability: ${gap.missingCapability}`);
    console.log(`  Reasoning: ${gap.reasoning}`);

    // Validate gap was identified
    if (!gap || !gap.type) {
      throw new Error('Gap detection failed to return a gap');
    }

    // Expected: coverage gap (missing tempo/intervals for improving pace)
    if (gap.type !== 'coverage') {
      console.log(`  ⚠ Warning: Expected coverage gap, got ${gap.type}`);
    }

    logSuccess(testName);
    return true;
  } catch (error: any) {
    logFailure(testName, error.message);
    return false;
  }
}

// ============================================================================
// MODE 2: SHOPPING MODE TESTS
// ============================================================================

function testShoppingModeSingleRequest() {
  const testName = 'Test 2: Shopping Mode (Single Request)';
  const description = 'User requests tempo shoes with specific feel preferences';

  logTestHeader(testName, description);

  try {
    const profile: RunnerProfile = {
      firstName: 'Sam',
      experience: 'advanced',
      primaryGoal: 'train_for_race',
    };

    const currentShoes: CurrentShoe[] = [];

    const shoeRequest: ShoeRequest = {
      role: 'tempo',
      feelPreferences: {
        softVsFirm: 1,        // Firm
        stableVsNeutral: 3,   // Balanced
        bouncyVsDamped: 1,    // Bouncy
      },
    };

    // Generate shopping recommendations
    const recommendations = generateShoppingRecommendations(
      shoeRequest,
      profile,
      currentShoes,
      catalogue
    );

    console.log('');
    console.log('RESULTS:');
    console.log(`  Request: ${shoeRequest.role} shoes`);
    console.log(`  Preferences: Firm (${shoeRequest.feelPreferences.softVsFirm}/5), Bouncy (${shoeRequest.feelPreferences.bouncyVsDamped}/5), Balanced (${shoeRequest.feelPreferences.stableVsNeutral}/5)`);
    console.log('');
    console.log('  Recommendations:');
    recommendations.forEach((r, i) => {
      console.log(`    ${i + 1}. ${r.fullName}`);
      console.log(`       Type: ${r.recommendationType}`);
      console.log(`       Weight: ${r.weight_g}g | Cushion: ${r.cushion_softness_1to5}/5 | Bounce: ${r.bounce_1to5}/5`);
      console.log(`       Reason: ${r.matchReason}`);
    });

    // Validate
    if (recommendations.length < 2 || recommendations.length > 3) {
      throw new Error(`Expected 2-3 recommendations, got ${recommendations.length}`);
    }

    if (!validateShoesExist(recommendations)) {
      throw new Error('Some recommended shoes do not exist in catalogue');
    }

    // Validate all shoes support tempo role
    const allSupportTempo = recommendations.every(r => {
      const shoe = catalogue.find(s => s.shoe_id === r.shoeId);
      return shoe && shoe.use_tempo_workout;
    });

    if (!allSupportTempo) {
      console.log('  ⚠ Warning: Not all recommendations support tempo role');
    }

    logSuccess(testName);
    return true;
  } catch (error: any) {
    logFailure(testName, error.message);
    return false;
  }
}

function testShoppingModeMultipleRequests() {
  const testName = 'Test 3: Shopping Mode (Multiple Requests)';
  const description = 'User requests recovery + tempo shoes with different preferences';

  logTestHeader(testName, description);

  try {
    const profile: RunnerProfile = {
      firstName: 'Jordan',
      experience: 'intermediate',
      primaryGoal: 'general_fitness',
    };

    const currentShoes: CurrentShoe[] = [
      {
        shoeId: 'nike_pegasus_41',
        roles: ['daily'],
        sentiment: 'neutral',
      },
    ];

    const shoeRequests: ShoeRequest[] = [
      {
        role: 'easy',
        feelPreferences: {
          softVsFirm: 5,        // Soft
          stableVsNeutral: 1,   // Stable
          bouncyVsDamped: 5,    // Damped
        },
      },
      {
        role: 'tempo',
        feelPreferences: {
          softVsFirm: 1,        // Firm
          stableVsNeutral: 3,   // Neutral
          bouncyVsDamped: 1,    // Bouncy
        },
      },
    ];

    console.log('');
    console.log('RESULTS:');

    const results = shoeRequests.map((request, index) => {
      console.log('');
      console.log(`  Request ${index + 1}: ${request.role} shoes`);

      const recommendations = generateShoppingRecommendations(
        request,
        profile,
        currentShoes,
        catalogue
      );

      console.log(`  Found ${recommendations.length} recommendations:`);
      recommendations.forEach((r, i) => {
        console.log(`    ${i + 1}. ${r.fullName}`);
        console.log(`       Cushion: ${r.cushion_softness_1to5}/5 | Bounce: ${r.bounce_1to5}/5 | Stability: ${r.stability_1to5}/5`);
      });

      return {
        role: request.role,
        recommendations,
        count: recommendations.length,
      };
    });

    // Validate each request got 2-3 recommendations
    for (const result of results) {
      if (result.count < 2 || result.count > 3) {
        throw new Error(`${result.role} request: Expected 2-3 recommendations, got ${result.count}`);
      }

      if (!validateShoesExist(result.recommendations)) {
        throw new Error(`${result.role} request: Some shoes do not exist in catalogue`);
      }
    }

    // Validate recovery shoes are soft
    const recoveryRecs = results.find(r => r.role === 'easy')?.recommendations || [];
    const avgRecoveryCushion = recoveryRecs.reduce((sum, r) => sum + r.cushion_softness_1to5, 0) / recoveryRecs.length;
    if (avgRecoveryCushion < 3) {
      console.log('  ⚠ Warning: Recovery shoes should be softer on average');
    }

    logSuccess(testName);
    return true;
  } catch (error: any) {
    logFailure(testName, error.message);
    return false;
  }
}

// ============================================================================
// MODE 3: ANALYSIS MODE TESTS
// ============================================================================

function testAnalysisMode() {
  const testName = 'Test 4: Analysis Mode';
  const description = 'Use pre-identified gap + feel preferences to recommend';

  logTestHeader(testName, description);

  try {
    const profile: RunnerProfile = {
      firstName: 'Chris',
      experience: 'advanced',
      primaryGoal: 'train_for_race',
    };

    const currentShoes: CurrentShoe[] = [
      {
        shoeId: 'hoka_bondi_9',
        roles: ['easy', 'long'],
        sentiment: 'love',
      },
      {
        shoeId: 'hoka_clifton_10',
        roles: ['daily'],
        sentiment: 'like',
      },
    ];

    // Step 1: Gap detection (simulating first call)
    const analysis = analyzeRotation(currentShoes, profile, catalogue);
    const gap = identifyPrimaryGap(analysis, profile, currentShoes, catalogue);

    console.log('');
    console.log('STEP 1: Gap Detection');
    console.log(`  Gap Type: ${gap.type}`);
    console.log(`  Gap Severity: ${gap.severity}`);
    console.log(`  Missing Capability: ${gap.missingCapability}`);
    console.log(`  Reasoning: ${gap.reasoning}`);

    // Step 2: User provides feel preferences for the gap
    const feelPreferences: FeelPreferences = {
      softVsFirm: 2,        // Firm (for tempo)
      stableVsNeutral: 3,   // Balanced
      bouncyVsDamped: 2,    // Bouncy
    };

    console.log('');
    console.log('STEP 2: User Feel Preferences');
    console.log(`  Softness: ${feelPreferences.softVsFirm}/5 (firm)`);
    console.log(`  Bounce: ${feelPreferences.bouncyVsDamped}/5 (bouncy)`);
    console.log(`  Stability: ${feelPreferences.stableVsNeutral}/5 (balanced)`);

    // Step 3: Generate recommendations using gap + feel preferences
    const recommendations = generateRecommendations(
      gap,
      profile,
      currentShoes,
      catalogue,
      feelPreferences
    );

    console.log('');
    console.log('STEP 3: Recommendations');
    recommendations.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.fullName}`);
      console.log(`     Type: ${r.recommendationType}`);
      console.log(`     Weight: ${r.weight_g}g | Cushion: ${r.cushion_softness_1to5}/5 | Bounce: ${r.bounce_1to5}/5`);
      console.log(`     Reason: ${r.matchReason}`);
      if (r.tradeOffs) {
        console.log(`     Trade-offs: ${r.tradeOffs}`);
      }
    });

    // Validate
    if (recommendations.length !== 3) {
      throw new Error(`Expected exactly 3 recommendations, got ${recommendations.length}`);
    }

    if (!validateShoesExist(recommendations)) {
      throw new Error('Some recommended shoes do not exist in catalogue');
    }

    logSuccess(testName);
    return true;
  } catch (error: any) {
    logFailure(testName, error.message);
    return false;
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

function runAllTests() {
  console.log('='.repeat(80));
  console.log('THREE-MODE RECOMMENDATION ENGINE TEST HARNESS');
  console.log('Testing: gap_detection, shopping, and analysis modes');
  console.log('='.repeat(80));
  console.log('');

  // Validate catalogue loaded
  if (!catalogue || catalogue.length === 0) {
    console.error('❌ FATAL: Shoe catalogue failed to load');
    process.exit(1);
  }
  console.log(`✓ Catalogue loaded: ${catalogue.length} shoes`);
  console.log('');

  const tests = [
    testGapDetectionMode,
    testShoppingModeSingleRequest,
    testShoppingModeMultipleRequests,
    testAnalysisMode,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = test();
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

  // Summary
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${tests.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('');

  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED - Three-Mode System Complete!');
    console.log('All modes (gap_detection, shopping, analysis) are working correctly.');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    console.log('Review the output above to debug issues.');
    process.exit(1);
  }
}

// ============================================================================
// EXECUTE
// ============================================================================

runAllTests();
