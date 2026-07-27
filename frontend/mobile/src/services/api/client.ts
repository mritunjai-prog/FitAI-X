import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const debuggerHost = Constants.expoConfig?.hostUri;
const localhost = debuggerHost?.split(':')[0] || 'localhost';

const API_BASE = Platform.OS === 'web' 
  ? 'http://localhost:4000/api/v1' 
  : `http://${localhost}:4000/api/v1`;

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL || API_BASE,
  timeout: 10000,
});
