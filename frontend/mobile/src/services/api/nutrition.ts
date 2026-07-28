import { apiClient } from './client';

export const fetchMeals = async () => {
  const { data } = await apiClient.get('/nutrition');
  return data;
};

export const fetchBudgetPlan = async (budget: number = 75, cals: number = 2500) => {
  const { data } = await apiClient.get(`/nutrition/budget-plan?budget=${budget}&cals=${cals}`);
  return data;
};

export const generateAiPlan = async (userId: string) => {
  const { data } = await apiClient.post('/nutrition/generate-plan', { userId });
  return data;
};
