// ============================================================================
// TYPE IMPORTS
// ============================================================================

import type {
  RunnerProfile,
  CurrentShoe,
  Gap,
  RecommendedShoe
} from '../../api/types';
import type { ShoeRequest, GapData } from '../contexts/ProfileContext';

// localStorage Helper Utilities for Cinda
// Use these functions to ensure consistent data handling across all epics

// Schema version for future migrations
const SCHEMA_VERSION = 1;

// localStorage keys
export const STORAGE_KEYS = {
  PROFILE: 'cindaProfile',
  SHOES: 'cindaShoes',
  RECOMMENDATIONS: 'cindaRecommendations',
  ANALYSIS: 'cindaAnalysis',
} as const;

// ============================================================================
// PROFILE (Epic 2)
// ============================================================================

export interface StoredProfile {
  schemaVersion: number;
  profile: RunnerProfile;
  createdAt: string;
  updatedAt: string;
}

/**
 * Save runner profile to localStorage
 */
export function saveProfile(profile: RunnerProfile): boolean {
  try {
    const stored: StoredProfile = {
      schemaVersion: SCHEMA_VERSION,
      profile,
      createdAt: getExistingProfile()?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(stored));
    return true;
  } catch (error) {
    console.error('Failed to save profile:', error);
    return false;
  }
}

/**
 * Load runner profile from localStorage
 */
export function loadProfile(): RunnerProfile | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!stored) return null;

    const data = JSON.parse(stored) as StoredProfile;

    // Handle schema migrations if needed
    if (data.schemaVersion !== SCHEMA_VERSION) {
      console.warn('Profile schema version mismatch, may need migration');
    }

    // Backwards-compat: older builds sometimes stored raceTime.timeMinutes as decimal HOURS.
    // Example: 2h 17m → 2.2833 (hours) instead of 137 (minutes).
    const profile = data.profile;
    const rt = profile?.raceTime;
    if (rt && typeof rt.timeMinutes === 'number' && rt.timeMinutes > 0) {
      const thresholds: Record<string, number> = {
        '5k': 6,
        '10k': 10,
        half: 30,
        marathon: 60,
      };
      const threshold = thresholds[rt.distance] ?? 10;

      const looksLikeHoursDecimal = rt.timeMinutes < threshold && !Number.isInteger(rt.timeMinutes);
      if (looksLikeHoursDecimal) {
        const normalized: RunnerProfile = {
          ...profile,
          raceTime: {
            ...rt,
            timeMinutes: Math.round(rt.timeMinutes * 60),
          },
        };
        // Persist migration so future loads are clean
        saveProfile(normalized);
        return normalized;
      }
    }

    return profile;
  } catch (error) {
    console.error('Failed to load profile:', error);
    return null;
  }
}

/**
 * Get full stored profile data (including metadata)
 */
export function getExistingProfile(): StoredProfile | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PROFILE);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Clear profile data
 */
export function clearProfile(): void {
  localStorage.removeItem(STORAGE_KEYS.PROFILE);
}

// ============================================================================
// CURRENT SHOES (Epic 3)
// ============================================================================

export interface StoredShoes {
  schemaVersion: number;
  shoes: CurrentShoe[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Save current shoes to localStorage
 */
export function saveShoes(shoes: CurrentShoe[]): boolean {
  try {
    const stored: StoredShoes = {
      schemaVersion: SCHEMA_VERSION,
      shoes,
      createdAt: getExistingShoes()?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.SHOES, JSON.stringify(stored));
    return true;
  } catch (error) {
    console.error('Failed to save shoes:', error);
    return false;
  }
}

/**
 * Load current shoes from localStorage
 */
export function loadShoes(): CurrentShoe[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SHOES);
    if (!stored) return [];

    const data = JSON.parse(stored) as StoredShoes;
    return data.shoes || [];
  } catch (error) {
    console.error('Failed to load shoes:', error);
    return [];
  }
}

/**
 * Get full stored shoes data (including metadata)
 */
export function getExistingShoes(): StoredShoes | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SHOES);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Add a single shoe to rotation
 */
export function addShoe(shoe: CurrentShoe): boolean {
  const current = loadShoes();
  return saveShoes([...current, shoe]);
}

/**
 * Remove a shoe from rotation by shoeId
 */
export function removeShoe(shoeId: string): boolean {
  const current = loadShoes();
  const filtered = current.filter(s => s.shoeId !== shoeId);
  return saveShoes(filtered);
}

/**
 * Update a shoe in rotation
 */
export function updateShoe(shoeId: string, updates: Partial<CurrentShoe>): boolean {
  const current = loadShoes();
  const updated = current.map(s =>
    s.shoeId === shoeId ? { ...s, ...updates } : s
  );
  return saveShoes(updated);
}

/**
 * Clear shoes data
 */
export function clearShoes(): void {
  localStorage.removeItem(STORAGE_KEYS.SHOES);
}

// ============================================================================
// RECOMMENDATIONS (Epic 4)
// ============================================================================

export interface StoredRecommendations {
  schemaVersion: number;
  gap: Gap;
  recommendations: RecommendedShoe[];
  summaryReasoning: string;
  createdAt: string;
}

/**
 * Save recommendations to localStorage
 */
export function saveRecommendations(
  gap: Gap,
  recommendations: RecommendedShoe[],
  summaryReasoning: string
): boolean {
  try {
    const stored: StoredRecommendations = {
      schemaVersion: SCHEMA_VERSION,
      gap,
      recommendations,
      summaryReasoning,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.RECOMMENDATIONS, JSON.stringify(stored));
    return true;
  } catch (error) {
    console.error('Failed to save recommendations:', error);
    return false;
  }
}

/**
 * Load recommendations from localStorage
 */
export function loadRecommendations(): StoredRecommendations | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.RECOMMENDATIONS);
    if (!stored) return null;

    return JSON.parse(stored) as StoredRecommendations;
  } catch (error) {
    console.error('Failed to load recommendations:', error);
    return null;
  }
}

/**
 * Clear recommendations data
 */
export function clearRecommendations(): void {
  localStorage.removeItem(STORAGE_KEYS.RECOMMENDATIONS);
}

// ============================================================================
// SHOE REQUESTS (Epic 2.5 - Shopping Mode)
// ============================================================================

export interface StoredShoeRequests {
  schemaVersion: number;
  shoeRequests: ShoeRequest[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Save shoe requests to localStorage
 */
export function saveShoeRequests(shoeRequests: ShoeRequest[]): boolean {
  try {
    const stored: StoredShoeRequests = {
      schemaVersion: SCHEMA_VERSION,
      shoeRequests,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem('cindaShoeRequests', JSON.stringify(stored));
    return true;
  } catch (error) {
    console.error('Failed to save shoe requests:', error);
    return false;
  }
}

/**
 * Load shoe requests from localStorage
 */
export function loadShoeRequests(): ShoeRequest[] | null {
  try {
    const stored = localStorage.getItem('cindaShoeRequests');
    if (!stored) return null;

    const data = JSON.parse(stored) as StoredShoeRequests;
    return data.shoeRequests || null;
  } catch (error) {
    console.error('Failed to load shoe requests:', error);
    return null;
  }
}

/**
 * Clear shoe requests data
 */
export function clearShoeRequests(): void {
  localStorage.removeItem('cindaShoeRequests');
}

// ============================================================================
// GAP DATA (Epic 2.5 - Analysis Mode)
// ============================================================================

export interface StoredGap {
  schemaVersion: number;
  gap: GapData;
  createdAt: string;
  updatedAt: string;
}

/**
 * Save gap data to localStorage
 */
export function saveGap(gap: GapData): boolean {
  try {
    const stored: StoredGap = {
      schemaVersion: SCHEMA_VERSION,
      gap,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem('cindaGap', JSON.stringify(stored));
    return true;
  } catch (error) {
    console.error('Failed to save gap:', error);
    return false;
  }
}

/**
 * Load gap data from localStorage
 */
export function loadGap(): GapData | null {
  try {
    const stored = localStorage.getItem('cindaGap');
    if (!stored) return null;

    const data = JSON.parse(stored) as StoredGap;
    return data.gap || null;
  } catch (error) {
    console.error('Failed to load gap:', error);
    return null;
  }
}

/**
 * Clear gap data
 */
export function clearGap(): void {
  localStorage.removeItem('cindaGap');
}

// ============================================================================
// CHAT CONTEXT (Epic 2.5 - Chat insights)
// ============================================================================

// PastShoeContext from ProfileContext
interface PastShoeContext {
  brand: string;
  model?: string;
  sentiment?: "liked" | "disliked" | "neutral";
}

export interface ChatContextData {
  injuries: string[];
  pastShoes: (string | PastShoeContext)[];
  fit: Record<string, string>;
  climate: string | null;
  requests: string[];
}

export interface StoredChatContext {
  schemaVersion: number;
  chatContext: ChatContextData;
  createdAt: string;
  updatedAt: string;
}

/**
 * Save chat context to localStorage
 */
export function saveChatContext(chatContext: ChatContextData): boolean {
  try {
    const stored: StoredChatContext = {
      schemaVersion: SCHEMA_VERSION,
      chatContext,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem('cindaChatContext', JSON.stringify(stored));
    return true;
  } catch (error) {
    console.error('Failed to save chat context:', error);
    return false;
  }
}

/**
 * Load chat context from localStorage
 */
export function loadChatContext(): ChatContextData | null {
  try {
    const stored = localStorage.getItem('cindaChatContext');
    if (!stored) return null;

    const data = JSON.parse(stored) as StoredChatContext;
    return data.chatContext || null;
  } catch (error) {
    console.error('Failed to load chat context:', error);
    return null;
  }
}

/**
 * Clear chat context data
 */
export function clearChatContext(): void {
  localStorage.removeItem('cindaChatContext');
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if user has completed profile
 */
export function hasCompletedProfile(): boolean {
  const profile = loadProfile();
  if (!profile) return false;

  // Check required fields (feel preferences are per-request now, not stored in profile)
  return !!(
    profile.firstName &&
    profile.experience &&
    profile.primaryGoal
  );
}

/**
 * Check if user has added shoes
 */
export function hasAddedShoes(): boolean {
  const shoes = loadShoes();
  return shoes.length > 0;
}

/**
 * Check if user has recommendations
 */
export function hasRecommendations(): boolean {
  const recs = loadRecommendations();
  return recs !== null && recs.recommendations.length === 3;
}

/**
 * Clear all Cinda data (for "Start Over")
 */
export function clearAllData(): void {
  clearProfile();
  clearShoes();
  clearRecommendations();
  localStorage.removeItem(STORAGE_KEYS.ANALYSIS);
}

/**
 * Get user progress through the flow
 */
export function getUserProgress(): {
  completedProfile: boolean;
  addedShoes: boolean;
  hasRecommendations: boolean;
  currentStep: 'profile' | 'shoes' | 'recommendations' | 'chat';
} {
  const completedProfile = hasCompletedProfile();
  const addedShoes = hasAddedShoes();
  const hasRecs = hasRecommendations();

  let currentStep: 'profile' | 'shoes' | 'recommendations' | 'chat';
  if (!completedProfile) {
    currentStep = 'profile';
  } else if (!addedShoes) {
    currentStep = 'shoes';
  } else if (!hasRecs) {
    currentStep = 'recommendations';
  } else {
    currentStep = 'chat';
  }

  return {
    completedProfile,
    addedShoes,
    hasRecommendations: hasRecs,
    currentStep,
  };
}

