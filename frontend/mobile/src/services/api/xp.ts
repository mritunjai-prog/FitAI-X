import { apiClient } from './client';

export interface XpStats {
  totalXp: number;
  level: number;
  tier: string;
  currentXp: number;
  nextLevelXp: number;
  todayXp: number;
  rankLabel: string;
  streak: number;
  longestStreak: number;
  weeklyWorkouts: number;
  totalWorkouts: number;
  xpProgressPct: number;
}

export const fetchXpStats = async (userId: string): Promise<XpStats> => {
  const { data } = await apiClient.get(`/xp/stats?userId=${userId}`);
  return data;
};

export const awardXpEvent = async (userId: string, event: string, reason?: string) => {
  const { data } = await apiClient.post('/xp/award', { userId, event, reason });
  return data;
};
