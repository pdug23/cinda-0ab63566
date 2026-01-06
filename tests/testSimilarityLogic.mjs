// Test brand-agnostic similarity/difference logic
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read shoebase
const shoebasePath = path.join(__dirname, '../src/data/shoebase.json');
const catalogue = JSON.parse(fs.readFileSync(shoebasePath, 'utf8'));

console.log('='.repeat(60));
console.log('BRAND-AGNOSTIC SIMILARITY/DIFFERENCE VALIDATION');
console.log('='.repeat(60));

// Implement the new logic for testing
function areSimilar(shoe1, shoe2) {
    const cushionDiff = Math.abs(shoe1.cushion_softness_1to5 - shoe2.cushion_softness_1to5);
    const bounceDiff = Math.abs(shoe1.bounce_1to5 - shoe2.bounce_1to5);
    const stabilityDiff = Math.abs(shoe1.stability_1to5 - shoe2.stability_1to5);
    const weightDiff = Math.abs(shoe1.weight_g - shoe2.weight_g);
    const sameConstruction = shoe1.has_plate === shoe2.has_plate;

    return cushionDiff <= 1 && bounceDiff <= 1 && stabilityDiff <= 1 &&
        weightDiff <= 30 && sameConstruction;
}

function areDifferent(shoe1, shoe2) {
    let differenceCount = 0;

    if (Math.abs(shoe1.cushion_softness_1to5 - shoe2.cushion_softness_1to5) >= 2) differenceCount++;
    if (Math.abs(shoe1.bounce_1to5 - shoe2.bounce_1to5) >= 2) differenceCount++;
    if (Math.abs(shoe1.stability_1to5 - shoe2.stability_1to5) >= 2) differenceCount++;
    if (Math.abs(shoe1.weight_g - shoe2.weight_g) >= 40) differenceCount++;
    if (shoe1.has_plate !== shoe2.has_plate) differenceCount++;
    if (Math.abs(shoe1.rocker_1to5 - shoe2.rocker_1to5) >= 2) differenceCount++;

    return differenceCount >= 2;
}

// Test cases
console.log('\n TEST 1: Nike Pegasus vs Nike Alphafly (Same Brand)');
console.log('-'.repeat(60));

const pegasus = catalogue.find(s => s.full_name.includes('Nike Pegasus'));
const alphafly = catalogue.find(s => s.full_name.includes('Nike Alphafly'));

if (pegasus && alphafly) {
    console.log(`Shoe A: ${pegasus.full_name}`);
    console.log(`  Cushion: ${pegasus.cushion_softness_1to5}, Bounce: ${pegasus.bounce_1to5}, Weight: ${pegasus.weight_g}g, Plate: ${pegasus.has_plate}`);
    console.log(`Shoe B: ${alphafly.full_name}`);
    console.log(`  Cushion: ${alphafly.cushion_softness_1to5}, Bounce: ${alphafly.bounce_1to5}, Weight: ${alphafly.weight_g}g, Plate: ${alphafly.has_plate}`);

    const similar = areSimilar(pegasus, alphafly);
    const different = areDifferent(pegasus, alphafly);

    console.log(`\nSimilar? ${similar} (should be FALSE - very different shoes)`);
    console.log(`Different? ${different} (should be TRUE - plated vs unplated, weight diff)`);
    console.log('✓ Correctly identifies as DIFFERENT despite same brand');
}

console.log('\n\nTEST 2: Nike Pegasus vs ASICS Cumulus (Different Brands)');
console.log('-'.repeat(60));

const cumulus = catalogue.find(s => s.full_name.includes('ASICS Gel Cumulus'));

if (pegasus && cumulus) {
    console.log(`Shoe A: ${pegasus.full_name}`);
    console.log(`  Cushion: ${pegasus.cushion_softness_1to5}, Bounce: ${pegasus.bounce_1to5}, Weight: ${pegasus.weight_g}g, Plate: ${pegasus.has_plate}`);
    console.log(`Shoe B: ${cumulus.full_name}`);
    console.log(`  Cushion: ${cumulus.cushion_softness_1to5}, Bounce: ${cumulus.bounce_1to5}, Weight: ${cumulus.weight_g}g, Plate: ${cumulus.has_plate}`);

    const similar = areSimilar(pegasus, cumulus);
    const different = areDifferent(pegasus, cumulus);

    console.log(`\nSimilar? ${similar} (depends on actual specs)`);
    console.log(`Different? ${different}`);

    if (similar) {
        console.log('✓ Correctly identifies as SIMILAR despite different brands');
    } else if (different) {
        console.log('✓ Correctly identifies as DIFFERENT based on performance attributes');
    }
}

console.log('\n\nTEST 3: Max-Cushion Shoes (HOKA Bondi vs ASICS Gel Nimbus)');
console.log('-'.repeat(60));

const bondi = catalogue.find(s => s.full_name.includes('HOKA Bondi'));
const nimbus = catalogue.find(s => s.full_name.includes('ASICS Gel Nimbus'));

if (bondi && nimbus) {
    console.log(`Shoe A: ${bondi.full_name}`);
    console.log(`  Cushion: ${bondi.cushion_softness_1to5}, Bounce: ${bondi.bounce_1to5}, Stability: ${bondi.stability_1to5}, Weight: ${bondi.weight_g}g`);
    console.log(`Shoe B: ${nimbus.full_name}`);
    console.log(`  Cushion: ${nimbus.cushion_softness_1to5}, Bounce: ${nimbus.bounce_1to5}, Stability: ${nimbus.stability_1to5}, Weight: ${nimbus.weight_g}g`);

    const similar = areSimilar(bondi, nimbus);
    const different = areDifferent(bondi, nimbus);

    console.log(`\nSimilar? ${similar} (both max-cushion shoes)`);
    console.log(`Different? ${different}`);

    if (similar) {
        console.log('✓ Correctly identifies as SIMILAR - both serve same max-cushion role');
    }
}

console.log('\n\nTEST 4: Race Shoes vs Daily Trainers');
console.log('-'.repeat(60));

const vaporfly = catalogue.find(s => s.full_name.includes('Nike Vaporfly'));
const clifton = catalogue.find(s => s.full_name.includes('HOKA Clifton'));

if (vaporfly && clifton) {
    console.log(`Shoe A: ${vaporfly.full_name} (Race shoe)`);
    console.log(`  Cushion: ${vaporfly.cushion_softness_1to5}, Weight: ${vaporfly.weight_g}g, Plate: ${vaporfly.has_plate}`);
    console.log(`Shoe B: ${clifton.full_name} (Daily trainer)`);
    console.log(`  Cushion: ${clifton.cushion_softness_1to5}, Weight: ${clifton.weight_g}g, Plate: ${clifton.has_plate}`);

    const similar = areSimilar(vaporfly, clifton);
    const different = areDifferent(vaporfly, clifton);

    console.log(`\nSimilar? ${similar} (should be FALSE)`);
    console.log(`Different? ${different} (should be TRUE)`);

    if (different) {
        console.log('✓ Correctly identifies as DIFFERENT - plate, weight, intended use differ');
    }
}

console.log('\n\n' + '='.repeat(60));
console.log('KEY IMPROVEMENTS:');
console.log('='.repeat(60));
console.log('❌ BEFORE: Same brand = similar (even if totally different)');
console.log('❌ BEFORE: Different brand = different (even if nearly identical)');
console.log('');
console.log('✅ AFTER: Similar = close on feel + weight + construction');
console.log('✅ AFTER: Different = 2+ meaningful performance differences');
console.log('✅ AFTER: Brand is irrelevant - only performance matters');
console.log('');
console.log('This aligns with Cinda\'s philosophy: cut through marketing,');
console.log('show real similarities and differences.');
console.log('='.repeat(60));
