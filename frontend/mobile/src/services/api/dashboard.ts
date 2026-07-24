import { apiClient } from './client';

export interface FeedItem {
  id: string;
  type: string;
  user: string;
  avatar: string;
  msg: string;
  time: string;
  likes: number;
  bpm?: number;
}

export interface ActiveUser {
  id: string;
  name: string;
  img: string;
  isLive: boolean;
}

export interface Vitals {
  id: string;
  bpm: number;
  recoveryUpr: number;
  recoveryLwr: number;
  recoveryCor: number;
  recoveryCrd: number;
  bodyBattery: number;
}

export const fetchFeed = async (): Promise<FeedItem[]> => {
  const { data } = await apiClient.get('/dashboard/feed');
  return data;
};

export const fetchActiveUsers = async (): Promise<ActiveUser[]> => {
  const { data } = await apiClient.get('/dashboard/active-users');
  return data;
};

export const fetchVitals = async (): Promise<Vitals> => {
  const { data } = await apiClient.get('/dashboard/vitals');
  return data;
};
