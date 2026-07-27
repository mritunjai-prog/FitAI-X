import { apiClient } from './client';

export const fetchCoachMessages = async () => {
  const { data } = await apiClient.get('/coach/messages');
  return data;
};

export const sendMessage = async (text: string, userId: string) => {
  const { data } = await apiClient.post('/coach/messages', { text, userId });
  return data;
};
