import { apiClient } from './client';

export interface FeedItem {
  id?: string;
  type?: string;
  user?: string;
  avatar?: string | null;
  msg?: string;
  time?: string;
  likes?: number;
  bpm?: number;
}

export interface ActiveUser {
  id?: string;
  name?: string;
  img?: string | null;
  isLive?: boolean;
}

export interface Vitals {
  bpm?: number;
  restingBpm?: number;
  bpmDelta?: number;
  hrv?: number;
  spo2?: number;
  respiratoryRate?: number;
  bodyBattery?: number;
  bodyBatteryDelta?: number;
  bodyBatteryTrend?: number[];
  moveProgress?: number;
  moveCurrent?: number;
  moveGoal?: number;
  waterProgress?: number;
  waterCurrent?: number;
  waterGoal?: number;
  trainProgress?: number;
  trainCurrent?: number;
  trainGoal?: number;
  recoveryUpper?: number;
  recoveryLower?: number;
  recoveryCore?: number;
  recoveryCardio?: number;
  loadM?: number;
  loadT?: number;
  loadW?: number;
  loadTh?: number;
  loadF?: number;
  loadSa?: number;
  loadSu?: number;
  loadTodayIndex?: number;
  caloriesRemaining?: number;
  caloriesConsumed?: number;
  caloriesGoal?: number;
  protein?: number;
  proteinGoal?: number;
  carbs?: number;
  carbsGoal?: number;
  fat?: number;
  fatGoal?: number;
}

export interface XpStats {
  level?: number;
  tier?: string;
  currentXp?: number;
  nextLevelXp?: number;
  todayXp?: number;
  rankLabel?: string;
}

export const fetchFeed = async (): Promise<FeedItem[]> => {
  const { data } = await apiClient.get('/dashboard/feed');
  return data;
};

export const fetchActiveUsers = async (): Promise<ActiveUser[]> => {
  const { data } = await apiClient.get('/dashboard/active-users');
  return data;
};

export const fetchVitals = async (): Promise<Vitals | null> => {
  try {
    const { data } = await apiClient.get('/dashboard/vitals');
    return data;
  } catch {
    return null;
  }
};
