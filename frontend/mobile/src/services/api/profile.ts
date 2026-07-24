import { apiClient } from './client';

export const fetchProfileData = async () => {
  const { data } = await apiClient.get('/profile');
  return data;
};
