// ============================================================================
// TEST: Shoe Retrieval Logic
// ============================================================================

import { getCandidates, getScoreBreakdown } from '../lib/shoeRetrieval';
import type { Shoe, ShoeRole } from '../types';
import shoebaseData from '../../src/data/shoebase.json';

const catalogue = shoebaseData as Shoe[];

console.log('='.repeat(60));
console.log('SHOE RETRIEVAL TESTS');
console.log('='.repeat(60));
console.log(`Catalogue size: ${catalogue.length} shoes\n`);

// ============================================================================
// Test 1: Daily trainer search
// ============================================================================

console.log('TEST 1: Daily trainer search (no preferences)');
console.log('-'.repeat(60));

const dailyCandidates = getCandidates(
  { roles: ['daily'] },
  catalogue
);

console.log(`Returned ${dailyCandidates.length} candidates`);
console.log('Top 5:');
dailyCandidates.slice(0, 5).forEach((shoe, i) => {
  const breakdown = getScoreBreakdown(shoe, { roles: ['daily'] });
  console.log(`  ${i + 1}. ${shoe.full_name} (Score: ${breakdown.score})`);
  console.log(`     Role: ${breakdown.breakdown?.roleScore}, Feel: ${breakdown.breakdown?.feelScore}, Available: ${breakdown.breakdown?.availabilityBonus}`);
});
console.log();

// ============================================================================
// Test 2: Trail shoe search
// ============================================================================

console.log('TEST 2: Trail shoe search');
console.log('-'.repeat(60));

const trailCandidates = getCandidates(
  { roles: ['trail'] },
  catalogue
);

console.log(`Returned ${trailCandidates.length} candidates`);
console.log('Top 3:');
trailCandidates.slice(0, 3).forEach((shoe, i) => {
  console.log(`  ${i + 1}. ${shoe.full_name}`);
  console.log(`     use_trail: ${shoe.use_trail}, surface: ${shoe.surface}`);
});
console.log();

// ============================================================================
// Test 3: Tempo/workout shoes with stability need
// ============================================================================

console.log('TEST 3: Tempo shoes with stability preference');
console.log('-'.repeat(60));

const tempoCandidates = getCandidates(
  {
    roles: ['tempo'],
    stabilityNeed: 'stable_feel',
  },
  catalogue
);

console.log(`Returned ${tempoCandidates.length} candidates`);
console.log('Top 5:');
tempoCandidates.slice(0, 5).forEach((shoe, i) => {
  const breakdown = getScoreBreakdown(shoe, {
    roles: ['tempo'],
    stabilityNeed: 'stable_feel',
  });
  console.log(`  ${i + 1}. ${shoe.full_name} (Score: ${breakdown.score})`);
  console.log(`     stability_1to5: ${shoe.stability_1to5}, support: ${shoe.support_type}`);
});
console.log();

// ============================================================================
// Test 4: Feel preference matching
// ============================================================================

console.log('TEST 4: Easy shoes - soft, stable, damped feel');
console.log('-'.repeat(60));

const easyCandidates = getCandidates(
  {
    roles: ['easy', 'long'],
    feelPreferences: {
      softVsFirm: 5,      // Very soft
      stableVsNeutral: 2, // Stable feel
      bouncyVsDamped: 4,  // Damped/smooth
    },
  },
  catalogue
);

console.log(`Returned ${easyCandidates.length} candidates`);
console.log('Top 5:');
easyCandidates.slice(0, 5).forEach((shoe, i) => {
  console.log(`  ${i + 1}. ${shoe.full_name}`);
  console.log(`     Soft: ${shoe.cushion_softness_1to5}, Stable: ${shoe.stability_1to5}, Bounce: ${shoe.bounce_1to5}`);
});
console.log();

// ============================================================================
// Test 5: Brand filtering
// ============================================================================

console.log('TEST 5: Nike daily trainers only');
console.log('-'.repeat(60));

const nikeCandidates = getCandidates(
  {
    roles: ['daily'],
    brandOnly: 'Nike',
  },
  catalogue
);

console.log(`Returned ${nikeCandidates.length} candidates`);
console.log('All Nike:', nikeCandidates.every(s => s.brand === 'Nike'));
console.log('Top 5:');
nikeCandidates.slice(0, 5).forEach((shoe, i) => {
  console.log(`  ${i + 1}. ${shoe.full_name}`);
});
console.log();

// ============================================================================
// Test 6: Exclude current shoes
// ============================================================================

console.log('TEST 6: Exclude specific shoes from rotation');
console.log('-'.repeat(60));

const firstShoeId = catalogue[0].shoe_id;
const secondShoeId = catalogue[1].shoe_id;

const excludedCandidates = getCandidates(
  {
    roles: ['daily'],
    excludeShoeIds: [firstShoeId, secondShoeId],
  },
  catalogue
);

const includesExcluded = excludedCandidates.some(
  s => s.shoe_id === firstShoeId || s.shoe_id === secondShoeId
);

console.log(`Excluded: ${catalogue[0].full_name}, ${catalogue[1].full_name}`);
console.log(`Returned ${excludedCandidates.length} candidates`);
console.log(`Contains excluded shoes: ${includesExcluded} (should be false)`);
console.log();

// ============================================================================
// Test 7: Race day shoes
// ============================================================================

console.log('TEST 7: Race day shoes');
console.log('-'.repeat(60));

const raceCandidates = getCandidates(
  { roles: ['race'] },
  catalogue
);

console.log(`Returned ${raceCandidates.length} candidates`);
console.log('Top 5:');
raceCandidates.slice(0, 5).forEach((shoe, i) => {
  console.log(`  ${i + 1}. ${shoe.full_name}`);
  console.log(`     Has plate: ${shoe.has_plate}, Weight: ${shoe.weight_g}g`);
});
console.log();

// ============================================================================
// Summary
// ============================================================================

console.log('='.repeat(60));
console.log('ALL TESTS COMPLETE');
console.log('='.repeat(60));
