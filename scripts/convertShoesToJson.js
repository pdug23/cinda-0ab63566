import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.join(__dirname, '..', 'src', 'data', 'shoebase.csv');
const JSON_PATH = path.join(__dirname, '..', 'src', 'data', 'shoebase.json');

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

function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

function convertValue(key, value) {
  // Check if value is blank/empty
  if (!value || !value.trim()) {
    return null;
  }

  const trimmedValue = value.trim();

  // Integer fields (1-5)
  const integerFields = [
    'cushion_softness_1to5',
    'bounce_1to5',
    'stability_1to5',
    'rocker_1to5',
    'ground_feel_1to5',
    'weight_feel_1to5'
  ];

  if (integerFields.includes(key)) {
    return parseInt(trimmedValue, 10);
  }

  // Year field
  if (key === 'release_year') {
    return parseInt(trimmedValue, 10);
  }

  // Number fields
  const numberFields = ['weight_g', 'heel_drop_mm'];
  if (numberFields.includes(key)) {
    return parseFloat(trimmedValue);
  }

  // Boolean fields
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

  if (booleanFields.includes(key)) {
    const normalizedValue = trimmedValue.toUpperCase();
    if (normalizedValue === 'TRUE' || normalizedValue === '1') {
      return true;
    }
    if (normalizedValue === 'FALSE' || normalizedValue === '0') {
      return false;
    }
    // If it's not a valid boolean value, return null
    return null;
  }

  // All other fields remain as strings
  return trimmedValue;
}

function convertShoesToJson() {
  // Read CSV file
  let content;
  try {
    content = fs.readFileSync(CSV_PATH, 'utf-8');
  } catch (err) {
    console.error(`Error reading CSV file: ${err.message}`);
    process.exit(1);
  }

  const { rows } = parseCSV(content);

  // Convert rows to proper types
  const shoes = rows.map(row => {
    const shoe = {};
    Object.keys(row).forEach(key => {
      shoe[key] = convertValue(key, row[key]);
    });
    return shoe;
  });

  // Count nulls
  let nullCount = 0;
  shoes.forEach(shoe => {
    Object.values(shoe).forEach(value => {
      if (value === null) {
        nullCount++;
      }
    });
  });

  // Write JSON file
  try {
    fs.writeFileSync(JSON_PATH, JSON.stringify(shoes, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing JSON file: ${err.message}`);
    process.exit(1);
  }

  // Print summary
  console.log(`✓ Successfully converted ${shoes.length} shoes to JSON`);
  console.log(`  Written to: ${JSON_PATH}`);
  console.log(`  Total null values: ${nullCount}`);
}

convertShoesToJson();
