import { createContext, useContext, useState, ReactNode } from "react";
import { PersonalBests } from "@/components/PBPickerModal";

// Types - matches Epic 1 types
export type ExperienceLevel = "beginner" | "intermediate" | "experienced" | "competitive";
export type PrimaryGoal = "general_fitness" | "get_faster" | "race_training" | "injury_comeback";
export type RunningPattern = "structured_training" | "mostly_easy" | "infrequent";
export type TrailRunning = "most_or_all" | "infrequently" | "want_to_start" | "no_trails";
export type FootStrike = "forefoot" | "midfoot" | "heel" | "unsure";

// Single race time (user picks one distance)
export interface RaceTime {
  distance: "5k" | "10k" | "13.1mi" | "26.2mi";
  hours: number;
  minutes: number;
  seconds: number;
}

// Step 1 data - basics + experience
export interface Step1Data {
  firstName: string;
  age: string;
  heightCm: number | null;
  weightKg: number | null;
  experience: ExperienceLevel | null;
}

// Weekly volume with unit
export interface WeeklyVolume {
  value: number;
  unit: "km" | "mi";
}

// Step 2 data - goals + race times + pattern
export interface Step2Data {
  primaryGoal: PrimaryGoal | null;
  personalBests: PersonalBests;
  raceTime: RaceTime | null;
  runningPattern: RunningPattern | null;
  trailRunning: TrailRunning | null;
  footStrike: FootStrike | null;
  doesTrail?: boolean;
  weeklyVolume: WeeklyVolume | null;
}

// Step 3 data - current shoe rotation
export type RunType = "all_my_runs" | "recovery" | "long_runs" | "workouts" | "races" | "trail";
export type ShoeSentiment = "love" | "like" | "neutral" | "dislike";

// Step 4 archetype selection for discovery mode
export type DiscoveryArchetype = "daily_trainer" | "recovery_shoe" | "workout_shoe" | "race_shoe" | "trail_shoe" | "not_sure";

// Deprecated - use DiscoveryArchetype
export type DiscoveryShoeRole = DiscoveryArchetype;

// Feel preferences for each shoe request - new 3-mode system
export type FeelValue = 1 | 2 | 3 | 4 | 5;
export type PreferenceMode = "cinda_decides" | "user_set" | "wildcard";
export type HeelDropOption = "0mm" | "1-4mm" | "5-8mm" | "9-12mm" | "13mm+";

export interface SliderPreference {
  mode: PreferenceMode;
  value?: FeelValue;  // Only set when mode === "user_set"
}

export interface HeelDropPreference {
  mode: PreferenceMode;
  values?: HeelDropOption[];  // Only set when mode === "user_set"
}

export type BrandPreferenceMode = "all" | "include" | "exclude";

export interface BrandPreference {
  mode: BrandPreferenceMode;
  brands: string[];
}

export interface FeelPreferences {
  cushionAmount: SliderPreference;
  stabilityAmount: SliderPreference;
  energyReturn: SliderPreference;
  rocker: SliderPreference;
  heelDropPreference: HeelDropPreference;
  brandPreference: BrandPreference;
}

// Feel gap from rotation analysis
export interface FeelGapInfo {
  dimension: 'cushion' | 'drop' | 'rocker' | 'stability';
  suggestion: 'low' | 'high';
  targetValue?: number;
}

// Contrast profile for variety recommendations
export interface ContrastProfile {
  cushion?: number;
  stability?: number;
  bounce?: number;
  rocker?: number;
  groundFeel?: number;
}

// Full recommendation slot from analysis
export interface AnalysisRecommendation {
  archetype: string;
  reason: string;
  feelGap?: FeelGapInfo;
  contrastWith?: ContrastProfile;
}

export interface ShoeRequest {
  archetype: DiscoveryArchetype;
  feelPreferences: FeelPreferences;
  feelGap?: FeelGapInfo;
  contrastWith?: ContrastProfile;
}

export interface GapData {
  type: 'coverage' | 'performance' | 'recovery' | 'redundancy';
  severity: 'low' | 'medium' | 'high';
  reasoning: string;
  missingCapability?: string;
  recommendedArchetype?: string;
}

export interface CurrentShoe {
  shoe: {
    shoe_id: string;
    brand: string;
    model: string;
    version: string;
    full_name: string;
    [key: string]: unknown;
  };
  runTypes: RunType[];
  sentiment: ShoeSentiment | null;
  loveTags?: string[];
  dislikeTags?: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Past shoe with brand sentiment from chat
export interface PastShoeContext {
  brand: string;
  model?: string;
  sentiment?: "liked" | "disliked" | "neutral";
}

// Extracted context from chat - accumulated across messages
export interface ChatContext {
  injuries: string[];
  pastShoes: (string | PastShoeContext)[];
  fit: Record<string, string>;
  climate: string | null;
  requests: string[];
}

export interface Step3Data {
  currentShoes: CurrentShoe[];
  chatHistory: ChatMessage[];
  chatContext: ChatContext;
}

// Step 4 data - discovery mode selections
export interface Step4Data {
  mode: "discovery" | "analysis" | null;
  selectedArchetypes: DiscoveryArchetype[];
  currentArchetypeIndex: number;
  shoeRequests: ShoeRequest[];
  gap: GapData | null;
  analysisRecommendations?: {
    primary: AnalysisRecommendation;
    secondary?: AnalysisRecommendation;
  };
}

export interface ProfileData {
  step1: Step1Data;
  step2: Step2Data;
  step3: Step3Data;
  step4: Step4Data;
}

const defaultStep1: Step1Data = {
  firstName: "",
  age: "",
  heightCm: null,
  weightKg: null,
  experience: null,
};

const defaultStep2: Step2Data = {
  primaryGoal: null,
  personalBests: {
    mile: null,
    "5k": null,
    "10k": null,
    half: null,
    marathon: null,
  },
  raceTime: null,
  runningPattern: null,
  trailRunning: null,
  footStrike: null,
  doesTrail: false,
  weeklyVolume: null,
};

const defaultStep3: Step3Data = {
  currentShoes: [],
  chatHistory: [],
  chatContext: {
    injuries: [],
    pastShoes: [],
    fit: {},
    climate: null,
    requests: [],
  },
};

const defaultStep4: Step4Data = {
  mode: null,
  selectedArchetypes: [],
  currentArchetypeIndex: 0,
  shoeRequests: [],
  gap: null,
};

interface ProfileContextType {
  profileData: ProfileData;
  updateStep1: (data: Partial<Step1Data>) => void;
  updateStep2: (data: Partial<Step2Data>) => void;
  updateStep3: (data: Partial<Step3Data>) => void;
  updateStep4: (data: Partial<Step4Data>) => void;
  updateChatHistory: (messages: ChatMessage[]) => void;
  updateChatContext: (context: Partial<ChatContext>) => void;
  clearAll: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profileData, setProfileData] = useState<ProfileData>({
    step1: defaultStep1,
    step2: defaultStep2,
    step3: defaultStep3,
    step4: defaultStep4,
  });

  const updateStep1 = (data: Partial<Step1Data>) => {
    setProfileData((prev) => ({
      ...prev,
      step1: { ...prev.step1, ...data },
    }));
  };

  const updateStep2 = (data: Partial<Step2Data>) => {
    setProfileData((prev) => ({
      ...prev,
      step2: { ...prev.step2, ...data },
    }));
  };

  const updateStep3 = (data: Partial<Step3Data>) => {
    setProfileData((prev) => ({
      ...prev,
      step3: { ...prev.step3, ...data },
    }));
  };

  const updateStep4 = (data: Partial<Step4Data>) => {
    setProfileData((prev) => ({
      ...prev,
      step4: { ...prev.step4, ...data },
    }));
  };

  const updateChatHistory = (messages: ChatMessage[]) => {
    setProfileData((prev) => ({
      ...prev,
      step3: { ...prev.step3, chatHistory: messages },
    }));
  };

  const updateChatContext = (context: Partial<ChatContext>) => {
    setProfileData((prev) => ({
      ...prev,
      step3: {
        ...prev.step3,
        chatContext: {
          injuries: [...prev.step3.chatContext.injuries, ...(context.injuries || [])],
          pastShoes: [...prev.step3.chatContext.pastShoes, ...(context.pastShoes || [])],
          fit: { ...prev.step3.chatContext.fit, ...(context.fit || {}) },
          climate: context.climate ?? prev.step3.chatContext.climate,
          requests: [...prev.step3.chatContext.requests, ...(context.requests || [])],
        },
      },
    }));
  };

  const clearAll = () => {
    setProfileData({
      step1: defaultStep1,
      step2: defaultStep2,
      step3: defaultStep3,
      step4: defaultStep4,
    });
  };

  return (
    <ProfileContext.Provider value={{ profileData, updateStep1, updateStep2, updateStep3, updateStep4, updateChatHistory, updateChatContext, clearAll }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
};
