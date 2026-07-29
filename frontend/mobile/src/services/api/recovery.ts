import { apiClient } from './client';

export const fetchRecoveryOverview = async (userId: string = 'demo-user-id') => {
  const { data } = await apiClient.get('/recovery/overview', {
    headers: { 'x-user-id': userId }
  });
  return data;
};

export const fetchRecoveryScore = async (userId: string = 'demo-user-id') => {
  const { data } = await apiClient.get('/recovery/score', {
    headers: { 'x-user-id': userId }
  });
  return data;
};

export const fetchSleepData = async (userId: string = 'demo-user-id') => {
  const { data } = await apiClient.get('/recovery/sleep', {
    headers: { 'x-user-id': userId }
  });
  return data;
};

export const fetchHeartRateData = async (userId: string = 'demo-user-id') => {
  const { data } = await apiClient.get('/recovery/heart-rate', {
    headers: { 'x-user-id': userId }
  });
  return data;
};

export const fetchWaterData = async (userId: string = 'demo-user-id') => {
  const { data } = await apiClient.get('/recovery/water', {
    headers: { 'x-user-id': userId }
  });
  return data;
};

export const fetchStressData = async (userId: string = 'demo-user-id') => {
  const { data } = await apiClient.get('/recovery/stress', {
    headers: { 'x-user-id': userId }
  });
  return data;
};

export const fetchRecoveryTimeline = async (userId: string = 'demo-user-id') => {
  const { data } = await apiClient.get('/recovery/timeline', {
    headers: { 'x-user-id': userId }
  });
  return data;
};

export const fetchRecoveryInsights = async (userId: string = 'demo-user-id') => {
  const { data } = await apiClient.get('/recovery/ai-insights', {
    headers: { 'x-user-id': userId }
  });
  return data;
};
