import { apiClient } from './client';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: string;
}

export interface Workout {
  id: string;
  title: string;
  duration: string;
  exercises: Exercise[];
}

export const fetchCurrentWorkout = async (): Promise<Workout> => {
  const { data } = await apiClient.get('/workouts/current');
  return data;
};

export const saveWorkout = async (workoutData: any) => {
  const { data } = await apiClient.post('/workouts', workoutData);
  return data;
};
