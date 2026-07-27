import { apiClient } from './client';

export const fetchRecoveryOverview = async () => {
  const { data } = await apiClient.get('/recovery/overview');
  return data;
};

export const fetchRecoveryScore = async () => {
  const { data } = await apiClient.get('/recovery/score');
  return data;
};

export const fetchSleepData = async () => {
  const { data } = await apiClient.get('/recovery/sleep');
  return data;
};

export const fetchHeartRateData = async () => {
  const { data } = await apiClient.get('/recovery/heart-rate');
  return data;
};

export const fetchWaterData = async () => {
  const { data } = await apiClient.get('/recovery/water');
  return data;
};

export const fetchStressData = async () => {
  const { data } = await apiClient.get('/recovery/stress');
  return data;
};

export const fetchRecoveryTimeline = async () => {
  const { data } = await apiClient.get('/recovery/timeline');
  return data;
};

export const fetchRecoveryInsights = async () => {
  const { data } = await apiClient.get('/recovery/ai-insights');
  return data;
};
