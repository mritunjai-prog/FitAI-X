import { apiClient } from './client';

export const fetchOverview = async () => {
  const { data } = await apiClient.get('/analytics/overview');
  return data;
};

export const fetchFitnessScore = async () => {
  const { data } = await apiClient.get('/analytics/fitness-score');
  return data;
};

export const fetchWorkouts = async (period: string = '7d') => {
  const { data } = await apiClient.get(`/analytics/workouts?period=${period}`);
  return data;
};

export const fetchCalories = async (period: string = '7d') => {
  const { data } = await apiClient.get(`/analytics/calories?period=${period}`);
  return data;
};

export const fetchWeight = async () => {
  const { data } = await apiClient.get('/analytics/weight');
  return data;
};

export const fetchStrength = async () => {
  const { data } = await apiClient.get('/analytics/strength');
  return data;
};

export const fetchStreak = async () => {
  const { data } = await apiClient.get('/analytics/streak');
  return data;
};

export const fetchAiInsights = async () => {
  const { data } = await apiClient.get('/analytics/ai-insights');
  return data;
};
