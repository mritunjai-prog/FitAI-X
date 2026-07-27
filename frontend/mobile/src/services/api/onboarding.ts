import { apiClient } from './client';

export interface OnboardingData {
  userId: string;
  age: string;
  weight: string;
  height: string;
  gender?: string;
  experience?: string;
  goal: string;
  equipment: string;
  diet: string;
  pastInjuries?: string;
  currentInjuries?: string;
  medicalConditions?: string;
  allergies?: string;
  physicalLimitations?: string;
  medications?: string;
}

export const submitOnboardingProfile = async (data: OnboardingData) => {
  const response = await apiClient.post('/onboarding/complete', data);
  return response.data;
};
