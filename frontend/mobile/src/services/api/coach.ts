import { apiClient } from './client';

export const fetchCoachMessages = async (userId: string) => {
  const { data } = await apiClient.get('/coach/messages', {
    headers: { 'x-user-id': userId }
  });
  return data;
};

export const sendMessage = async (text: string, userId: string) => {
  const { data } = await apiClient.post('/coach/messages', { text }, {
    headers: { 'x-user-id': userId }
  });
  return data;
};
