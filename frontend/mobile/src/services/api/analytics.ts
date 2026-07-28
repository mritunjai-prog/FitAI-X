import { apiClient } from './client';

const headers = { 'x-user-id': 'demo-user-id' };

export const fetchOverview = async () => {
  const { data } = await apiClient.get('/analytics/overview', { headers });
  return data;
};

export const fetchFitnessScore = async () => {
  const { data } = await apiClient.get('/analytics/fitness-score', { headers });
  return data;
};

export const fetchWorkouts = async (period: string = '7d') => {
  const { data } = await apiClient.get(`/analytics/workouts?period=${period}`, { headers });
  return data;
};

export const fetchCalories = async (period: string = '7d') => {
  const { data } = await apiClient.get(`/analytics/calories?period=${period}`, { headers });
  return data;
};

export const fetchWeight = async () => {
  const { data } = await apiClient.get('/analytics/weight', { headers });
  return data;
};

export const fetchStrength = async () => {
  const { data } = await apiClient.get('/analytics/strength', { headers });
  return data;
};

export const fetchStreak = async () => {
  const { data } = await apiClient.get('/analytics/streak', { headers });
  return data;
};

export const fetchAiInsights = async () => {
  const { data } = await apiClient.get('/analytics/ai-insights', { headers });
  return data;
};
