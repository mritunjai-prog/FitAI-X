import { apiClient } from './client';

export const fetchProfileData = async (userId?: string) => {
  const url = userId ? `/profile?userId=${userId}` : '/profile';
  const { data } = await apiClient.get(url);
  return data;
};

export const updateProfile = async (userId: string, updates: any) => {
  const { data } = await apiClient.put('/profile', { userId, ...updates });
  return data;
};

export const exportUserData = async (userId: string) => {
  const { data } = await apiClient.get(`/profile/export?userId=${userId}`);
  return data;
};
