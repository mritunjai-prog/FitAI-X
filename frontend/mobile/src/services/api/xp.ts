import { apiClient } from './client';

export const fetchXpStats = async (userId: string) => {
  const { data } = await apiClient.get(`/xp/stats?userId=${userId}`);
  return data;
};

export const awardXpEvent = async (userId: string, event: string, reason?: string) => {
  const { data } = await apiClient.post('/xp/award', { userId, event, reason });
  return data;
};
