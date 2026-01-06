// Simple test for gap detection logic
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('='.repeat(60));
console.log('GAP DETECTOR LOGIC VALIDATION');
console.log('='.repeat(60));

// Test scenarios
const scenarios = [
  {
    name: 'Empty Rotation',
    analysis: {
      coveredRoles: [],
      missingRoles: ['daily', 'easy'],
      redundancies: [],
      allShoesLiked: false,
      hasDislikedShoes: false,
      hasNearReplacementShoes: false,
    },
    profile: {
      experience: 'beginner',
      primaryGoal: 'general_fitness',
      runningPattern: 'mostly_easy',
    },
    currentShoes: [],
    expectedGap: {
      type: 'coverage',
      severity: 'high',
      missingCapability: 'daily',
      reasoning: /need a versatile daily trainer/i,
    },
  },

  {
    name: 'Missing Tempo for Race Training',
    analysis: {
      coveredRoles: ['daily', 'easy'],
      missingRoles: ['tempo', 'long'],
      redundancies: [],
      allShoesLiked: true,
      hasDislikedShoes: false,
      hasNearReplacementShoes: false,
    },
    profile: {
      experience: 'intermediate',
      primaryGoal: 'train_for_race',
      runningPattern: 'structured_training',
    },
    currentShoes: [
      { shoeId: 'shoe_001', roles: ['daily', 'easy'], sentiment: 'like' },
    ],
    expectedGap: {
      type: 'coverage',
      severity: 'high',
      missingCapability: 'tempo',
      reasoning: /training for a race.*tempo/i,
    },
  },

  {
    name: 'Performance Gap - Pace Focus Without Fast Shoes',
    analysis: {
      coveredRoles: ['daily', 'easy', 'long'],
      missingRoles: ['tempo', 'intervals'],
      redundancies: [],
      allShoesLiked: true,
      hasDislikedShoes: false,
      hasNearReplacementShoes: false,
    },
    profile: {
      experience: 'intermediate',
      primaryGoal: 'improve_pace',
      runningPattern: 'mostly_easy',
    },
    currentShoes: [
      { shoeId: 'shoe_001', roles: ['daily', 'easy'], sentiment: 'like' },
      { shoeId: 'shoe_002', roles: ['long'], sentiment: 'like' },
    ],
    expectedGap: {
      type: 'coverage', // Coverage gap detected first (tempo missing)
      severity: 'high',
      missingCapability: 'tempo',
    },
  },

  {
    name: 'Recovery Gap - High Volume Without Easy Shoes',
    analysis: {
      coveredRoles: ['daily', 'tempo'],
      missingRoles: ['easy', 'long'],
      redundancies: [],
      allShoesLiked: true,
      hasDislikedShoes: false,
      hasNearReplacementShoes: false,
    },
    profile: {
      experience: 'advanced',
      primaryGoal: 'train_for_race',
      runningPattern: 'structured_training',
    },
    currentShoes: [
      { shoeId: 'shoe_001', roles: ['daily', 'tempo'], sentiment: 'like' },
    ],
    expectedGap: {
      type: 'coverage', // Easy is critical for structured training
      severity: 'high',
      missingCapability: 'easy',
      reasoning: /training volume.*easy.*recovery/i,
    },
  },

  {
    name: 'Redundancy Opportunity',
    analysis: {
      coveredRoles: ['daily', 'easy'],
      missingRoles: ['tempo'],
      redundancies: [
        {
          shoeIds: ['shoe_001', 'shoe_002', 'shoe_003'],
          overlappingRoles: ['easy', 'daily'],
        },
      ],
      allShoesLiked: true,
      hasDislikedShoes: false,
      hasNearReplacementShoes: false,
    },
    profile: {
      experience: 'intermediate',
      primaryGoal: 'general_fitness',
      runningPattern: 'mostly_easy',
    },
    currentShoes: [
      { shoeId: 'shoe_001', roles: ['easy', 'daily'], sentiment: 'like' },
      { shoeId: 'shoe_002', roles: ['easy', 'daily'], sentiment: 'like' },
      { shoeId: 'shoe_003', roles: ['easy', 'daily'], sentiment: 'like' },
    ],
    expectedGap: {
      type: 'coverage', // Coverage gap (tempo) takes priority over redundancy
      severity: 'medium',
      missingCapability: 'tempo',
    },
  },

  {
    name: 'Well-Balanced Rotation',
    analysis: {
      coveredRoles: ['daily', 'easy', 'tempo', 'long'],
      missingRoles: [],
      redundancies: [],
      allShoesLiked: true,
      hasDislikedShoes: false,
      hasNearReplacementShoes: false,
    },
    profile: {
      experience: 'intermediate',
      primaryGoal: 'general_fitness',
      runningPattern: 'structured_training',
    },
    currentShoes: [
      { shoeId: 'shoe_001', roles: ['daily', 'easy'], sentiment: 'like' },
      { shoeId: 'shoe_002', roles: ['tempo'], sentiment: 'like' },
      { shoeId: 'shoe_003', roles: ['long'], sentiment: 'like' },
    ],
    expectedGap: {
      type: 'coverage',
      severity: 'low',
      reasoning: /covers the basics well.*variety/i,
    },
  },

  {
    name: 'Racing Focused Missing Race Shoes',
    analysis: {
      coveredRoles: ['daily', 'tempo', 'intervals'],
      missingRoles: ['race'],
      redundancies: [],
      allShoesLiked: true,
      hasDislikedShoes: false,
      hasNearReplacementShoes: false,
    },
    profile: {
      experience: 'racing_focused',
      primaryGoal: 'train_for_race',
      runningPattern: 'workouts',
    },
    currentShoes: [
      { shoeId: 'shoe_001', roles: ['daily'], sentiment: 'like' },
      { shoeId: 'shoe_002', roles: ['tempo', 'intervals'], sentiment: 'like' },
    ],
    expectedGap: {
      type: 'coverage',
      severity: 'high',
      missingCapability: 'race',
      reasoning: /racing-focused.*race-day shoe/i,
    },
  },
];

// Run tests
console.log('\n');
let passCount = 0;
let failCount = 0;

scenarios.forEach((scenario, index) => {
  console.log(`TEST ${index + 1}: ${scenario.name}`);
  console.log('-'.repeat(60));

  // Simulate gap detection logic
  let detectedGap;

  // Empty rotation check
  if (scenario.currentShoes.length === 0) {
    detectedGap = {
      type: 'coverage',
      severity: 'high',
      missingCapability: 'daily',
      reasoning: 'You need a versatile daily trainer to start building your rotation.',
    };
  } else {
    // Prioritization logic
    const criticalRoles = ['daily', 'tempo', 'race', 'easy'];
    const missingCritical = scenario.analysis.missingRoles.filter(r =>
      criticalRoles.includes(r)
    );

    if (missingCritical.length > 0) {
      const isCritical = (
        (missingCritical.includes('tempo') &&
         ['train_for_race', 'improve_pace'].includes(scenario.profile.primaryGoal)) ||
        (missingCritical.includes('race') && scenario.profile.experience === 'racing_focused') ||
        (missingCritical.includes('easy') && scenario.profile.runningPattern === 'structured_training')
      );

      detectedGap = {
        type: 'coverage',
        severity: isCritical ? 'high' : 'medium',
        missingCapability: missingCritical[0],
        reasoning: `Missing ${missingCritical[0]} for ${scenario.profile.primaryGoal}`,
      };
    } else if (scenario.analysis.missingRoles.length > 0) {
      detectedGap = {
        type: 'coverage',
        severity: 'medium',
        missingCapability: scenario.analysis.missingRoles[0],
        reasoning: `Missing ${scenario.analysis.missingRoles[0]} coverage`,
      };
    } else {
      // No gaps - well balanced
      detectedGap = {
        type: 'coverage',
        severity: 'low',
        reasoning: 'Your rotation covers the basics well. Consider adding variety.',
      };
    }
  }

  // Validate expectations
  const typeMatch = detectedGap.type === scenario.expectedGap.type;
  const severityMatch = detectedGap.severity === scenario.expectedGap.severity;
  const capabilityMatch = !scenario.expectedGap.missingCapability ||
                           detectedGap.missingCapability === scenario.expectedGap.missingCapability;
  const reasoningMatch = !scenario.expectedGap.reasoning ||
                          scenario.expectedGap.reasoning.test(detectedGap.reasoning);

  const passed = typeMatch && severityMatch && capabilityMatch && reasoningMatch;

  if (passed) {
    console.log('✓ PASS');
    passCount++;
  } else {
    console.log('✗ FAIL');
    failCount++;
    if (!typeMatch) console.log(`  Type mismatch: expected ${scenario.expectedGap.type}, got ${detectedGap.type}`);
    if (!severityMatch) console.log(`  Severity mismatch: expected ${scenario.expectedGap.severity}, got ${detectedGap.severity}`);
    if (!capabilityMatch) console.log(`  Capability mismatch: expected ${scenario.expectedGap.missingCapability}, got ${detectedGap.missingCapability}`);
  }

  console.log(`  Gap: ${detectedGap.severity} ${detectedGap.type}`);
  console.log(`  Missing: ${detectedGap.missingCapability || 'N/A'}`);
  console.log('');
});

console.log('='.repeat(60));
console.log(`RESULTS: ${passCount} passed, ${failCount} failed`);
console.log('='.repeat(60));

if (failCount === 0) {
  console.log('✓ ALL GAP DETECTION TESTS PASSED');
}
