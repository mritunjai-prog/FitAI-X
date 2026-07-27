import { apiClient } from './client';

export const fetchProfileData = async (userId?: string) => {
  const url = userId ? `/profile?userId=${userId}` : '/profile';
  const { data } = await apiClient.get(url);
  return data;
};
