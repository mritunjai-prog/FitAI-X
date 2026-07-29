import { apiClient } from './client';

export const fetchBudgetPlan = async (budget: number, cals: number, diet?: string) => {
  const { data } = await apiClient.get(`/nutrition/budget-plan?budget=${budget}&cals=${cals}${diet ? `&diet=${encodeURIComponent(diet)}` : ''}`);
  return data;
};

export const generateAiPlan = async (userId: string) => {
  const { data } = await apiClient.post('/nutrition/generate-plan', { userId });
  return data;
};

export const fetchMealPlan = async (userId: string) => {
  const { data } = await apiClient.get(`/nutrition/meal-plan?userId=${userId}`);
  return data;
};

export const regenerateMealPlan = async (userId: string, day: 'today' | 'tomorrow') => {
  const { data } = await apiClient.post('/nutrition/regenerate-plan', { userId, day });
  return data;
};
