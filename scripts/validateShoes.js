import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.join(__dirname, '..', 'src', 'data', 'shoebase.csv');

function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',');
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    row._lineNumber = i + 1;
    rows.push(row);
  }

  return { headers, rows };
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);

  return values;
}

function validateShoes() {
  const errors = [];

  // Read CSV file
  let content;
  try {
    content = fs.readFileSync(CSV_PATH, 'utf-8');
  } catch (err) {
    console.error(`Error reading CSV file: ${err.message}`);
    process.exit(1);
  }

  const { rows } = parseCSV(content);

  // Track shoe_ids for uniqueness check
  const shoeIds = new Set();
  const fullNames = new Set();

  // First pass: collect all full_names for similarity validation
  rows.forEach(row => {
    if (row.full_name && row.full_name.trim()) {
      fullNames.add(row.full_name.trim());
    }
  });

  // Second pass: validate each row
  rows.forEach(row => {
    const lineNum = row._lineNumber;
    const shoeId = row.shoe_id;

    // Validate shoe_id exists
    if (!shoeId || !shoeId.trim()) {
      errors.push(`Row ${lineNum}: Missing shoe_id`);
      return; // Can't continue validation without shoe_id
    }

    // Validate shoe_id is unique
    if (shoeIds.has(shoeId)) {
      errors.push(`Row ${lineNum} (${shoeId}): Duplicate shoe_id`);
    } else {
      shoeIds.add(shoeId);
    }

    // Validate full_name exists and has no leading/trailing whitespace
    if (!row.full_name || !row.full_name.trim()) {
      errors.push(`Row ${lineNum} (${shoeId}): Missing full_name`);
    } else if (row.full_name !== row.full_name.trim()) {
      errors.push(`Row ${lineNum} (${shoeId}): full_name has leading/trailing whitespace`);
    }

    // Validate similar_to field
    if (row.similar_to && row.similar_to.trim()) {
      const similarItems = row.similar_to.split(', ');

      // Check if 2-3 items
      if (similarItems.length < 2 || similarItems.length > 3) {
        errors.push(`Row ${lineNum} (${shoeId}): similar_to must have 2-3 items (found ${similarItems.length})`);
      }

      // Check separator format (should be comma+space)
      if (!/^[^,]+(, [^,]+){1,2}$/.test(row.similar_to.trim())) {
        errors.push(`Row ${lineNum} (${shoeId}): similar_to items must be separated by comma+space`);
      }

      // Validate each similar_to item matches an existing full_name
      similarItems.forEach(item => {
        const trimmedItem = item.trim();
        if (!fullNames.has(trimmedItem)) {
          errors.push(`Row ${lineNum} (${shoeId}): similar_to item "${trimmedItem}" does not match any existing full_name`);
        }
      });
    }

    // Validate 1-5 integer fields
    const ratingFields = [
      'cushion_softness_1to5',
      'bounce_1to5',
      'stability_1to5',
      'rocker_1to5',
      'ground_feel_1to5',
      'weight_feel_1to5'
    ];

    ratingFields.forEach(field => {
      const value = row[field];
      if (!value || !value.trim()) {
        errors.push(`Row ${lineNum} (${shoeId}): ${field} is missing`);
      } else {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 1 || num > 5 || value.trim() !== num.toString()) {
          errors.push(`Row ${lineNum} (${shoeId}): ${field} must be an integer 1-5 (found "${value}")`);
        }
      }
    });

    // Validate weight_g (if present)
    if (row.weight_g && row.weight_g.trim()) {
      const num = parseFloat(row.weight_g);
      if (isNaN(num)) {
        errors.push(`Row ${lineNum} (${shoeId}): weight_g must be a number (found "${row.weight_g}")`);
      }
    }

    // Validate heel_drop_mm (if present)
    if (row.heel_drop_mm && row.heel_drop_mm.trim()) {
      const num = parseFloat(row.heel_drop_mm);
      if (isNaN(num)) {
        errors.push(`Row ${lineNum} (${shoeId}): heel_drop_mm must be a number (found "${row.heel_drop_mm}")`);
      }
    }

    // Validate boolean fields
    const booleanFields = [
      'has_plate',
      'use_daily',
      'use_easy_recovery',
      'use_long_run',
      'use_tempo_workout',
      'use_speed_intervals',
      'use_race',
      'use_trail',
      'use_walking_all_day'
    ];

    booleanFields.forEach(field => {
      const value = row[field];
      if (value && value.trim()) {
        const normalizedValue = value.trim().toUpperCase();
        const validBooleans = ['TRUE', 'FALSE', '1', '0'];
        if (!validBooleans.includes(normalizedValue)) {
          errors.push(`Row ${lineNum} (${shoeId}): ${field} must be TRUE/FALSE/true/false/1/0 (found "${value}")`);
        }
      }
    });
  });

  // Output results
  if (errors.length > 0) {
    console.error('Validation errors found:\n');
    errors.forEach(error => console.error(error));
    console.error(`\nTotal errors: ${errors.length}`);
    process.exit(1);
  } else {
    console.log('✓ All validation checks passed');
    process.exit(0);
  }
}

validateShoes();
