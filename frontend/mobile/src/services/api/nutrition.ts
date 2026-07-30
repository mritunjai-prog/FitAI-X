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

export const regenerateMealPlan = async (userId: string, day: 'today' | 'tomorrow' | 'all') => {
  const { data } = await apiClient.post('/nutrition/regenerate-plan', { userId, day });
  return data;
};

export const fetchUserMeals = async (userId: string) => {
  const { data } = await apiClient.get(`/nutrition?userId=${userId}`);
  return data;
};

export const logFood = async (payload: { userId: string; name: string; cals: number; protein?: number; carbs?: number; fats?: number }) => {
  const { data } = await apiClient.post('/nutrition/log-food', payload);
  return data;
};

export const aiScanFood = async (foodDescription: string) => {
  const { data } = await apiClient.post('/nutrition/ai-scan', { foodDescription });
  return data;
};

export const searchFoods = async (query: string) => {
  const { data } = await apiClient.get(`/nutrition/foods/search?q=${encodeURIComponent(query)}`);
  return data;
};

export const logWater = async (userId: string, amountMl: number) => {
  const { data } = await apiClient.post('/nutrition/water', { userId, amountMl });
  return data;
};

export const fetchNutritionDashboard = async (userId: string) => {
  const { data } = await apiClient.get(`/nutrition/dashboard?userId=${userId}`);
  return data;
};
