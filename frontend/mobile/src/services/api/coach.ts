import { apiClient } from './client';

export const fetchCoachMessages = async () => {
  const { data } = await apiClient.get('/coach/messages');
  return data;
};
