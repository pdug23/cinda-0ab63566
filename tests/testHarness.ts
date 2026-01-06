// ============================================================================
// CINDA RECOMMENDATION ENGINE TEST HARNESS
// End-to-end validation of the complete recommendation pipeline
// ============================================================================

import { analyzeRotation } from '../api/lib/rotationAnalyzer';
import { identifyPrimaryGap } from '../api/lib/gapDetector';
import { generateRecommendations } from '../api/lib/recommendationEngine';
import type { RunnerProfile, CurrentShoe, Shoe, GapType, GapSeverity, RecommendedShoe } from '../api/types';
import shoebase from '../src/data/shoebase.json';

const catalogue = shoebase as Shoe[];

// ============================================================================
// TEST CASE DEFINITIONS
// ============================================================================

interface TestCase {
    name: string;
    profile: RunnerProfile;
    currentShoes: CurrentShoe[];
    expectedGapType: GapType;
    expectedSeverity: GapSeverity;
    description: string;
}

const testCases: TestCase[] = [
    // TEST 1: BEGINNER WITH NO SHOES
    {
        name: 'Test 1: Beginner with no shoes',
        description: 'New runner needs a versatile daily trainer to start their journey',
        profile: {
            firstName: 'Alex',
            experience: 'beginner',
            primaryGoal: 'general_fitness',
            runningPattern: 'infrequent',
            feelPreferences: {
                softVsFirm: 4,
                stableVsNeutral: 3,
                bouncyVsDamped: 3,
            },
        },
        currentShoes: [],
        expectedGapType: 'coverage',
        expectedSeverity: 'high',
    },

    // TEST 2: INTERMEDIATE RUNNER WITH DAILY TRAINER ONLY
    {
        name: 'Test 2: Intermediate runner with daily trainer only',
        description: 'Runner training for race needs tempo/workout shoe',
        profile: {
            firstName: 'Jordan',
            experience: 'intermediate',
            primaryGoal: 'train_for_race',
            runningPattern: 'structured_training',
            feelPreferences: {
                softVsFirm: 3,
                stableVsNeutral: 3,
                bouncyVsDamped: 4,
            },
        },
        currentShoes: [
            {
                shoeId: 'nike_pegasus_41',
                roles: ['daily'],
                sentiment: 'like',
            },
        ],
        expectedGapType: 'coverage',
        expectedSeverity: 'high',
    },

    // TEST 3: ADVANCED RUNNER WITH MAX-CUSHION ONLY
    {
        name: 'Test 3: Advanced runner with max-cushion only',
        description: 'Runner focused on pace improvement needs responsive shoes (coverage gap for missing tempo/intervals)',
        profile: {
            firstName: 'Sam',
            experience: 'advanced',
            primaryGoal: 'improve_pace',
            runningPattern: 'workouts',
            feelPreferences: {
                softVsFirm: 5,
                stableVsNeutral: 3,
                bouncyVsDamped: 4,
            },
        },
        currentShoes: [
            {
                shoeId: 'hoka_bondi_9',
                roles: ['easy'],
                sentiment: 'like',
            },
            {
                shoeId: 'hoka_clifton_10',
                roles: ['daily'],
                sentiment: 'like',
            },
        ],
        expectedGapType: 'coverage', // Missing tempo/intervals roles (coverage gap takes priority)
        expectedSeverity: 'high',
    },

    // TEST 4: RUNNER WITH REDUNDANCY
    {
        name: 'Test 4: Runner with redundancy',
        description: 'Runner has 3 similar max-cushion shoes, missing daily trainer (coverage gap takes priority over redundancy)',
        profile: {
            firstName: 'Casey',
            experience: 'intermediate',
            primaryGoal: 'general_fitness',
            runningPattern: 'mostly_easy',
            feelPreferences: {
                softVsFirm: 5,
                stableVsNeutral: 3,
                bouncyVsDamped: 3,
            },
        },
        currentShoes: [
            {
                shoeId: 'hoka_bondi_9',
                roles: ['easy', 'long'],
                sentiment: 'like',
            },
            {
                shoeId: 'hoka_clifton_10',
                roles: ['easy', 'long'],
                sentiment: 'like',
            },
            {
                shoeId: 'nike_vomero_plus',
                roles: ['easy', 'long'],
                sentiment: 'like',
            },
        ],
        expectedGapType: 'coverage', // Coverage gap (missing daily) takes priority over redundancy
        expectedSeverity: 'high',
    },
];

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate that all recommended shoes exist in the catalogue
 */
function validateShoesExist(recommendations: RecommendedShoe[]): boolean {
    return recommendations.every(rec =>
        catalogue.some(shoe => shoe.shoe_id === rec.shoeId)
    );
}

/**
 * Validate that recommendations are diverse
 * Should have at least 2 different brands OR meaningful spec differences
 */
function validateDiversity(recommendations: RecommendedShoe[]): boolean {
    const brands = recommendations.map(r => r.brand);
    const uniqueBrands = new Set(brands);

    // Should have at least 2 different brands OR meaningful differences
    return uniqueBrands.size >= 2 || hasMeaningfulDifferences(recommendations);
}

/**
 * Check for meaningful differences in shoe specs
 */
function hasMeaningfulDifferences(recommendations: RecommendedShoe[]): boolean {
    const cushions = recommendations.map(r => r.cushion_softness_1to5);
    const weights = recommendations.map(r => r.weight_g);
    const bounces = recommendations.map(r => r.bounce_1to5);

    const cushionRange = Math.max(...cushions) - Math.min(...cushions);
    const weightRange = Math.max(...weights) - Math.min(...weights);
    const bounceRange = Math.max(...bounces) - Math.min(...bounces);

    // Meaningful if there's variation in cushion (2+ points), weight (40g+), or bounce (2+ points)
    return cushionRange >= 2 || weightRange >= 40 || bounceRange >= 2;
}

/**
 * Validate gap severity is reasonable (exact match or within one level)
 */
function validateSeverity(actual: GapSeverity, expected: GapSeverity): boolean {
    const severityLevels: GapSeverity[] = ['low', 'medium', 'high'];
    const actualIndex = severityLevels.indexOf(actual);
    const expectedIndex = severityLevels.indexOf(expected);

    // Allow exact match or within 1 level
    return Math.abs(actualIndex - expectedIndex) <= 1;
}

// ============================================================================
// TEST RUNNER
// ============================================================================

/**
 * Run all test cases and report results
 */
function runTests() {
    console.log('='.repeat(80));
    console.log('CINDA RECOMMENDATION ENGINE TEST HARNESS');
    console.log('End-to-end validation of rotation analysis → gap detection → recommendations');
    console.log('='.repeat(80));
    console.log('');

    // Validate catalogue loaded
    if (!catalogue || catalogue.length === 0) {
        console.error('❌ FATAL: Shoe catalogue failed to load');
        process.exit(1);
    }
    console.log(`✓ Catalogue loaded: ${catalogue.length} shoes`);
    console.log('');

    let passed = 0;
    let failed = 0;

    for (const test of testCases) {
        console.log('-'.repeat(80));
        console.log(`${test.name}`);
        console.log(`Description: ${test.description}`);
        console.log('-'.repeat(80));

        try {
            // ======================================================================
            // RUN PIPELINE
            // ======================================================================

            const analysis = analyzeRotation(test.currentShoes, test.profile, catalogue);
            const gap = identifyPrimaryGap(analysis, test.profile, test.currentShoes, catalogue);
            const recommendations = generateRecommendations(gap, test.profile, test.currentShoes, catalogue);

            // ======================================================================
            // LOG RESULTS
            // ======================================================================

            console.log('');
            console.log('RESULTS:');
            console.log(`  Gap Type: ${gap.type} (expected: ${test.expectedGapType})`);
            console.log(`  Gap Severity: ${gap.severity} (expected: ${test.expectedSeverity})`);
            console.log(`  Reasoning: ${gap.reasoning}`);
            console.log('');
            console.log('  Recommendations:');
            recommendations.forEach((r, i) => {
                console.log(`    ${i + 1}. ${r.fullName}`);
                console.log(`       Type: ${r.recommendationType}`);
                console.log(`       Weight: ${r.weight_g}g | Cushion: ${r.cushion_softness_1to5}/5 | Bounce: ${r.bounce_1to5}/5`);
                console.log(`       Reason: ${r.matchReason}`);
                if (r.tradeOffs) {
                    console.log(`       Trade-offs: ${r.tradeOffs}`);
                }
            });

            // ======================================================================
            // VALIDATE RESULTS
            // ======================================================================

            console.log('');
            console.log('VALIDATIONS:');

            const validations = [
                {
                    name: 'Gap type matches expected',
                    pass: gap.type === test.expectedGapType,
                    actual: gap.type,
                    expected: test.expectedGapType,
                },
                {
                    name: 'Gap severity is reasonable',
                    pass: validateSeverity(gap.severity, test.expectedSeverity),
                    actual: gap.severity,
                    expected: test.expectedSeverity,
                },
                {
                    name: 'Exactly 3 recommendations',
                    pass: recommendations.length === 3,
                    actual: recommendations.length,
                    expected: 3,
                },
                {
                    name: 'All shoes exist in catalogue',
                    pass: validateShoesExist(recommendations),
                },
                {
                    name: 'Recommendations are diverse',
                    pass: validateDiversity(recommendations),
                },
            ];

            // Check validations
            const allPassed = validations.every(v => v.pass);

            validations.forEach(v => {
                const icon = v.pass ? '✓' : '✗';
                let message = `  ${icon} ${v.name}`;
                if (!v.pass && 'actual' in v && 'expected' in v) {
                    message += ` (got: ${v.actual}, expected: ${v.expected})`;
                }
                console.log(message);
            });

            console.log('');
            if (allPassed) {
                console.log('✓ PASSED');
                passed++;
            } else {
                console.log('✗ FAILED');
                failed++;
            }

        } catch (error: any) {
            console.log('');
            console.log('✗ FAILED - Error during execution');
            console.error(`  Error: ${error.message}`);
            if (error.stack) {
                console.error(`  Stack: ${error.stack}`);
            }
            failed++;
        }

        console.log('');
    }

    // ==========================================================================
    // SUMMARY
    // ==========================================================================

    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Tests: ${testCases.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log('');

    if (failed === 0) {
        console.log('🎉 ALL TESTS PASSED - Epic 1 Complete!');
        console.log('The recommendation pipeline is working end-to-end.');
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

runTests();
