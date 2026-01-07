import { createContext, useContext, useState, ReactNode } from "react";
import { PersonalBests } from "@/components/PBPickerModal";

// Types - matches Epic 1 types
export type ExperienceLevel = "beginner" | "intermediate" | "advanced" | "racing_focused";
export type PrimaryGoal = "general_fitness" | "improve_pace" | "train_for_race" | "comfort_recovery" | "just_for_fun";
export type RunningPattern = "infrequent" | "mostly_easy" | "structured_training" | "workouts" | "long_run_focus";
export type TrailRunning = "most_runs" | "infrequent" | "want_to_start";

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
  runningPattern: RunningPattern | null;
  trailRunning: TrailRunning | null;
  weeklyVolume: WeeklyVolume | null;
}

export interface ProfileData {
  step1: Step1Data;
  step2: Step2Data;
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
  runningPattern: null,
  trailRunning: null,
  weeklyVolume: null,
};

interface ProfileContextType {
  profileData: ProfileData;
  updateStep1: (data: Partial<Step1Data>) => void;
  updateStep2: (data: Partial<Step2Data>) => void;
  clearAll: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profileData, setProfileData] = useState<ProfileData>({
    step1: defaultStep1,
    step2: defaultStep2,
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

  const clearAll = () => {
    setProfileData({
      step1: defaultStep1,
      step2: defaultStep2,
    });
  };

  return (
    <ProfileContext.Provider value={{ profileData, updateStep1, updateStep2, clearAll }}>
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
