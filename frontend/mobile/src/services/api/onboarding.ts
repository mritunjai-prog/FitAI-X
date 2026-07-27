import { apiClient } from './client';

export interface OnboardingData {
  userId: string;
  age: string;
  weight: string;
  height: string;
  goal: string;
  equipment: string;
  diet: string;
}

export const submitOnboardingProfile = async (data: { userId: string, age: string, weight: string, height: string, goal: string, equipment: string, diet: string }) => {
  const response = await apiClient.post('/onboarding/complete', data);
  return response.data;
};
