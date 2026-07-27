import { apiClient } from './client';

export interface OnboardingData {
  userId: string;
  age: string;
  weight: string;
  goal: string;
  equipment: string;
  diet: string;
}

export const submitOnboardingProfile = async (data: OnboardingData) => {
  const response = await apiClient.post('/onboarding/complete', data);
  return response.data;
};
