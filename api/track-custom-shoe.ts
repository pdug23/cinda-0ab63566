// ============================================================================
// TRACK CUSTOM SHOE ENDPOINT
// Logs shoes users add that aren't in the 72-shoe catalogue
// ============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs';
import * as path from 'path';

interface CustomShoeEntry {
  shoeName: string;
  timestamp: string;
  userContext?: {
    experience?: string;
    primaryGoal?: string;
  };
}

/**
 * Main handler for /api/track-custom-shoe endpoint
 * Logs custom shoes to data/custom-shoes.json for product insights
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
    });
    return;
  }

  try {
    // =========================================================================
    // 1. VALIDATE REQUEST
    // =========================================================================

    const { shoeName, userContext } = req.body;

    if (!shoeName || typeof shoeName !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid request body. Required: shoeName (string)',
      });
      return;
    }

    // =========================================================================
    // 2. BUILD LOG ENTRY
    // =========================================================================

    const entry: CustomShoeEntry = {
      shoeName: shoeName.trim(),
      timestamp: new Date().toISOString(),
      userContext: {
        experience: userContext?.experience,
        primaryGoal: userContext?.primaryGoal,
      },
    };

    console.log('[CUSTOM_SHOE_TRACKED]', entry);

    // =========================================================================
    // 3. PERSIST TO FILE (MVP APPROACH)
    // =========================================================================

    const filePath = path.join(process.cwd(), 'data', 'custom-shoes.json');

    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Read existing data or create empty array
    let data: CustomShoeEntry[] = [];
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      try {
        data = JSON.parse(fileContent);
      } catch (parseError) {
        console.error('[track-custom-shoe] Failed to parse existing file, starting fresh:', parseError);
        data = [];
      }
    }

    // Append new entry
    data.push(entry);

    // Write back
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    console.log('[track-custom-shoe] Entry saved. Total entries:', data.length);

    // =========================================================================
    // 4. RETURN SUCCESS
    // =========================================================================

    res.status(200).json({
      success: true,
      message: 'Custom shoe tracked successfully',
    });

  } catch (error: any) {
    // =========================================================================
    // CATCH-ALL ERROR HANDLER
    // =========================================================================

    console.error('[track-custom-shoe] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error. Please try again.',
    });
  }
}
