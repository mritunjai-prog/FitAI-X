import { apiClient } from './client';

export const fetchSchedule = async () => {
  const { data } = await apiClient.get('/calendar');
  return data;
};
