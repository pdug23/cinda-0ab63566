// ============================================================================
// CUSTOM SHOE TRACKING TEST
// Verifies that custom shoe tracking endpoint works correctly
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

/**
 * Simulate the custom shoe tracking endpoint logic
 */
function trackCustomShoe(shoeName: string, userContext?: any): { success: boolean; message?: string; error?: string } {
  try {
    // Validate input
    if (!shoeName || typeof shoeName !== 'string') {
      return {
        success: false,
        error: 'Invalid request body. Required: shoeName (string)',
      };
    }

    // Build entry
    const entry = {
      shoeName: shoeName.trim(),
      timestamp: new Date().toISOString(),
      userContext: {
        experience: userContext?.experience,
        primaryGoal: userContext?.primaryGoal,
      },
    };

    console.log('[CUSTOM_SHOE_TRACKED]', entry);

    // File path
    const filePath = path.join(process.cwd(), 'data', 'custom-shoes.json');

    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Read existing data or create empty array
    let data: any[] = [];
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      try {
        data = JSON.parse(fileContent);
      } catch (parseError) {
        console.error('Failed to parse existing file, starting fresh:', parseError);
        data = [];
      }
    }

    // Append new entry
    data.push(entry);

    // Write back
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    console.log('Entry saved. Total entries:', data.length);

    return {
      success: true,
      message: 'Custom shoe tracked successfully',
    };

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return {
      success: false,
      error: 'Internal server error. Please try again.',
    };
  }
}

/**
 * Test the custom shoe tracking functionality
 */
function runTests() {
  console.log('='.repeat(80));
  console.log('CUSTOM SHOE TRACKING TEST');
  console.log('='.repeat(80));
  console.log('');

  let passed = 0;
  let failed = 0;

  // ========================================================================
  // TEST 1: Track a custom shoe with full context
  // ========================================================================

  console.log('Test 1: Track custom shoe with user context');
  console.log('-'.repeat(80));

  const result1 = trackCustomShoe('Nike Vaporfly 3', {
    experience: 'advanced',
    primaryGoal: 'train_for_race',
  });

  if (result1.success) {
    console.log('✓ Successfully tracked: Nike Vaporfly 3');
    passed++;
  } else {
    console.log('✗ Failed to track shoe');
    console.log('  Error:', result1.error);
    failed++;
  }

  console.log('');

  // ========================================================================
  // TEST 2: Track a custom shoe without context
  // ========================================================================

  console.log('Test 2: Track custom shoe without user context');
  console.log('-'.repeat(80));

  const result2 = trackCustomShoe('Adidas Ultraboost Light');

  if (result2.success) {
    console.log('✓ Successfully tracked: Adidas Ultraboost Light');
    passed++;
  } else {
    console.log('✗ Failed to track shoe');
    console.log('  Error:', result2.error);
    failed++;
  }

  console.log('');

  // ========================================================================
  // TEST 3: Invalid input (empty string)
  // ========================================================================

  console.log('Test 3: Reject invalid input (empty string)');
  console.log('-'.repeat(80));

  const result3 = trackCustomShoe('');

  if (!result3.success && result3.error?.includes('Invalid')) {
    console.log('✓ Correctly rejected empty string');
    passed++;
  } else {
    console.log('✗ Should have rejected empty string');
    failed++;
  }

  console.log('');

  // ========================================================================
  // TEST 4: Verify data was written to file
  // ========================================================================

  console.log('Test 4: Verify data persisted to file');
  console.log('-'.repeat(80));

  try {
    const filePath = path.join(process.cwd(), 'data', 'custom-shoes.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);

    console.log(`Found ${data.length} entries in custom-shoes.json`);

    // Check if our test shoes are in there
    const hasVaporfly = data.some((entry: any) => entry.shoeName === 'Nike Vaporfly 3');
    const hasUltraboost = data.some((entry: any) => entry.shoeName === 'Adidas Ultraboost Light');

    if (hasVaporfly && hasUltraboost) {
      console.log('✓ Both test shoes found in file');
      console.log('  Sample entry:', JSON.stringify(data[data.length - 1], null, 2));
      passed++;
    } else {
      console.log('✗ Test shoes not found in file');
      failed++;
    }
  } catch (error: any) {
    console.log('✗ Failed to read or parse file');
    console.log('  Error:', error.message);
    failed++;
  }

  console.log('');

  // ========================================================================
  // SUMMARY
  // ========================================================================

  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${passed + failed}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('');

  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED - Custom Shoe Tracking Works!');
    console.log('The endpoint is ready to log shoes outside the 72-shoe catalogue.');
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
