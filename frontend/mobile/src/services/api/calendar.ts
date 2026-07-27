import { apiClient } from './client';

export const fetchSchedule = async (userId?: string) => {
  const url = userId ? `/calendar?userId=${userId}` : '/calendar';
  const { data } = await apiClient.get(url);
  return data;
};
