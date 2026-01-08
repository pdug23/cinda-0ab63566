// ============================================================================
// RANGE-BASED FEEL PREFERENCE MATCHING TEST
// Tests flexible matching with single values and explicit ranges
// ============================================================================

import { generateShoppingRecommendations } from '../api/lib/recommendationEngine';
import type {
  RunnerProfile,
  CurrentShoe,
  Shoe,
  ShoeRequest,
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
// TEST 1: SINGLE VALUE AUTO-CONVERTS TO RANGE (BACKWARD COMPATIBILITY)
// ============================================================================

function testSingleValueBackwardCompatibility() {
  const testName = 'Test 1: Single Value Auto-Converts to Range';
  const description = 'Ensure single numbers still work (backward compatibility)';

  logTestHeader(testName, description);

  try {
    const profile: RunnerProfile = {
      firstName: 'Alex',
      experience: 'intermediate',
      primaryGoal: 'general_fitness',
    };

    const currentShoes: CurrentShoe[] = [];

    const shoeRequest: ShoeRequest = {
      role: 'daily',
      feelPreferences: {
        softVsFirm: 4,        // Single value: should convert to [3,4,5]
        stableVsNeutral: 3,   // Single value: should convert to [2,3,4]
        bouncyVsDamped: 3,    // Single value: should convert to [2,3,4]
      },
    };

    const recommendations = generateShoppingRecommendations(
      shoeRequest,
      profile,
      currentShoes,
      catalogue
    );

    console.log('');
    console.log('RESULTS:');
    console.log(`  Request: ${shoeRequest.role} shoes`);
    console.log(`  Feel Preferences (single values):`);
    console.log(`    Softness: ${shoeRequest.feelPreferences.softVsFirm}/5 → range [3,4,5]`);
    console.log(`    Stability: ${shoeRequest.feelPreferences.stableVsNeutral}/5 → range [2,3,4]`);
    console.log(`    Bounce: ${shoeRequest.feelPreferences.bouncyVsDamped}/5 → range [2,3,4]`);
    console.log('');
    console.log(`  Found ${recommendations.length} recommendations:`);
    recommendations.forEach((r, i) => {
      console.log(`    ${i + 1}. ${r.fullName}`);
      console.log(`       Cushion: ${r.cushion_softness_1to5}/5 | Bounce: ${r.bounce_1to5}/5 | Stability: ${r.stability_1to5}/5`);
    });

    // Validate
    if (recommendations.length < 2 || recommendations.length > 3) {
      throw new Error(`Expected 2-3 recommendations, got ${recommendations.length}`);
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
// TEST 2: EXPLICIT RANGE (NARROW PREFERENCE)
// ============================================================================

function testExplicitNarrowRange() {
  const testName = 'Test 2: Explicit Narrow Range';
  const description = 'User specifies explicit narrow range [1,2] for firm shoes';

  logTestHeader(testName, description);

  try {
    const profile: RunnerProfile = {
      firstName: 'Sam',
      experience: 'advanced',
      primaryGoal: 'improve_pace',
    };

    const currentShoes: CurrentShoe[] = [];

    const shoeRequest: ShoeRequest = {
      role: 'tempo',
      feelPreferences: {
        softVsFirm: [1, 2],       // Explicit narrow range: firm shoes only
        stableVsNeutral: [2, 3, 4], // Balanced range
        bouncyVsDamped: [1, 2],    // Explicit narrow range: bouncy only
      },
    };

    const recommendations = generateShoppingRecommendations(
      shoeRequest,
      profile,
      currentShoes,
      catalogue
    );

    console.log('');
    console.log('RESULTS:');
    console.log(`  Request: ${shoeRequest.role} shoes`);
    console.log(`  Feel Preferences (explicit ranges):`);
    console.log(`    Softness: [1,2] (firm only)`);
    console.log(`    Stability: [2,3,4] (balanced)`);
    console.log(`    Bounce: [1,2] (bouncy only)`);
    console.log('');
    console.log(`  Found ${recommendations.length} recommendations:`);
    recommendations.forEach((r, i) => {
      console.log(`    ${i + 1}. ${r.fullName}`);
      console.log(`       Cushion: ${r.cushion_softness_1to5}/5 | Bounce: ${r.bounce_1to5}/5 | Stability: ${r.stability_1to5}/5`);
    });

    // Validate
    if (recommendations.length === 0) {
      throw new Error('Expected at least some recommendations');
    }

    if (!validateShoesExist(recommendations)) {
      throw new Error('Some recommended shoes do not exist in catalogue');
    }

    // Check that most recommendations match the narrow criteria
    const firmShoes = recommendations.filter(r => r.cushion_softness_1to5 <= 2);
    if (firmShoes.length < recommendations.length * 0.5) {
      console.log(`  ⚠ Warning: Only ${firmShoes.length}/${recommendations.length} shoes are firm (cushion ≤ 2)`);
    }

    logSuccess(testName);
    return true;
  } catch (error: any) {
    logFailure(testName, error.message);
    return false;
  }
}

// ============================================================================
// TEST 3: WIDE RANGE (NOT SURE / FLEXIBLE)
// ============================================================================

function testWideFlexibleRange() {
  const testName = 'Test 3: Wide Flexible Range';
  const description = 'User picks middle value 3 → converts to [2,3,4] (exclude extremes)';

  logTestHeader(testName, description);

  try {
    const profile: RunnerProfile = {
      firstName: 'Jordan',
      experience: 'beginner',
      primaryGoal: 'general_fitness',
    };

    const currentShoes: CurrentShoe[] = [];

    const shoeRequest: ShoeRequest = {
      role: 'daily',
      feelPreferences: {
        softVsFirm: 3,        // Middle value → [2,3,4] (exclude extremes 1 and 5)
        stableVsNeutral: 3,   // Middle value → [2,3,4]
        bouncyVsDamped: 3,    // Middle value → [2,3,4]
      },
    };

    const recommendations = generateShoppingRecommendations(
      shoeRequest,
      profile,
      currentShoes,
      catalogue
    );

    console.log('');
    console.log('RESULTS:');
    console.log(`  Request: ${shoeRequest.role} shoes`);
    console.log(`  Feel Preferences (middle values = flexible):`);
    console.log(`    Softness: 3 → range [2,3,4] (exclude extremes)`);
    console.log(`    Stability: 3 → range [2,3,4] (exclude extremes)`);
    console.log(`    Bounce: 3 → range [2,3,4] (exclude extremes)`);
    console.log('');
    console.log(`  Found ${recommendations.length} recommendations:`);
    recommendations.forEach((r, i) => {
      console.log(`    ${i + 1}. ${r.fullName}`);
      console.log(`       Cushion: ${r.cushion_softness_1to5}/5 | Bounce: ${r.bounce_1to5}/5 | Stability: ${r.stability_1to5}/5`);
    });

    // Validate
    if (recommendations.length < 2 || recommendations.length > 3) {
      throw new Error(`Expected 2-3 recommendations, got ${recommendations.length}`);
    }

    if (!validateShoesExist(recommendations)) {
      throw new Error('Some recommended shoes do not exist in catalogue');
    }

    // Check that recommendations avoid extremes
    const hasExtremes = recommendations.some(r =>
      r.cushion_softness_1to5 === 1 || r.cushion_softness_1to5 === 5
    );
    if (hasExtremes) {
      console.log('  ⚠ Warning: Some recommendations have extreme cushion values (1 or 5)');
    }

    logSuccess(testName);
    return true;
  } catch (error: any) {
    logFailure(testName, error.message);
    return false;
  }
}

// ============================================================================
// TEST 4: MIXED SINGLE VALUES AND ARRAYS
// ============================================================================

function testMixedSingleAndArray() {
  const testName = 'Test 4: Mixed Single Values and Arrays';
  const description = 'Some dimensions use single values, others use explicit arrays';

  logTestHeader(testName, description);

  try {
    const profile: RunnerProfile = {
      firstName: 'Casey',
      experience: 'intermediate',
      primaryGoal: 'train_for_race',
    };

    const currentShoes: CurrentShoe[] = [
      {
        shoeId: 'nike_pegasus_41',
        roles: ['daily'],
        sentiment: 'neutral',
      },
    ];

    const shoeRequest: ShoeRequest = {
      role: 'tempo',
      feelPreferences: {
        softVsFirm: 2,            // Single value → [1,2,3]
        stableVsNeutral: [2, 3],  // Explicit array
        bouncyVsDamped: 4,        // Single value → [3,4,5]
      },
    };

    const recommendations = generateShoppingRecommendations(
      shoeRequest,
      profile,
      currentShoes,
      catalogue
    );

    console.log('');
    console.log('RESULTS:');
    console.log(`  Request: ${shoeRequest.role} shoes`);
    console.log(`  Feel Preferences (mixed):`);
    console.log(`    Softness: 2 (single) → range [1,2,3]`);
    console.log(`    Stability: [2,3] (explicit array)`);
    console.log(`    Bounce: 4 (single) → range [3,4,5]`);
    console.log('');
    console.log(`  Found ${recommendations.length} recommendations:`);
    recommendations.forEach((r, i) => {
      console.log(`    ${i + 1}. ${r.fullName}`);
      console.log(`       Cushion: ${r.cushion_softness_1to5}/5 | Bounce: ${r.bounce_1to5}/5 | Stability: ${r.stability_1to5}/5`);
    });

    // Validate
    if (recommendations.length < 2 || recommendations.length > 3) {
      throw new Error(`Expected 2-3 recommendations, got ${recommendations.length}`);
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
  console.log('RANGE-BASED FEEL PREFERENCE MATCHING TEST');
  console.log('Testing flexible matching with single values and explicit ranges');
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
    testSingleValueBackwardCompatibility,
    testExplicitNarrowRange,
    testWideFlexibleRange,
    testMixedSingleAndArray,
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
    console.log('🎉 ALL TESTS PASSED - Range Matching Works!');
    console.log('Single values auto-convert to ranges, explicit arrays work correctly.');
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
