import { apiClient } from './client';

export const fetchOverview = async (userId?: string) => {
  const headers = userId ? { 'x-user-id': userId } : undefined;
  const { data } = await apiClient.get('/analytics/overview', { headers });
  return data;
};

export const fetchFitnessScore = async (userId?: string) => {
  const headers = userId ? { 'x-user-id': userId } : undefined;
  const { data } = await apiClient.get('/analytics/fitness-score', { headers });
  return data;
};

export const fetchWorkouts = async (period: string = '7d', userId?: string) => {
  const headers = userId ? { 'x-user-id': userId } : undefined;
  const { data } = await apiClient.get(`/analytics/workouts?period=${period}`, { headers });
  return data;
};

export const fetchCalories = async (period: string = '7d', userId?: string) => {
  const headers = userId ? { 'x-user-id': userId } : undefined;
  const { data } = await apiClient.get(`/analytics/calories?period=${period}`, { headers });
  return data;
};

export const fetchWeight = async (userId?: string) => {
  const headers = userId ? { 'x-user-id': userId } : undefined;
  const { data } = await apiClient.get('/analytics/weight', { headers });
  return data;
};

export const fetchStrength = async (userId?: string) => {
  const headers = userId ? { 'x-user-id': userId } : undefined;
  const { data } = await apiClient.get('/analytics/strength', { headers });
  return data;
};

export const fetchStreak = async (userId?: string) => {
  const headers = userId ? { 'x-user-id': userId } : undefined;
  const { data } = await apiClient.get('/analytics/streak', { headers });
  return data;
};

export const fetchSummary = async (userId?: string) => {
  const headers = userId ? { 'x-user-id': userId } : undefined;
  const { data } = await apiClient.get('/analytics/summary', { headers });
  return data;
};
