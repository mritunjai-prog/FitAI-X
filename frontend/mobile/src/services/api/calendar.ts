import { apiClient } from './client';

export const fetchSchedule = async (userId?: string) => {
  const url = userId ? `/calendar?userId=${userId}` : '/calendar';
  const { data } = await apiClient.get(url);
  return data;
};

export const addManualWorkout = async (payload: {
  userId: string;
  dayIndex: number;
  title: string;
  intensity: string;
  exercises: { name: string; sets: number; reps: number; weight: string; notes?: string }[];
}) => {
  const { data } = await apiClient.post('/calendar/manual', payload);
  return data;
};

export const deleteCalendarEvent = async (id: string) => {
  const { data } = await apiClient.delete(`/calendar/${id}`);
  return data;
};

export const updateCalendarEvent = async (id: string, updates: { title?: string; intensity?: string; dayIndex?: number }) => {
  const { data } = await apiClient.patch(`/calendar/${id}`, updates);
  return data;
};
