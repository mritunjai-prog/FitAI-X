import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../services/api/client';

type User = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  hasOnboarded: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [hasOnboarded, setHasOnboarded] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('@auth_user');
        const onboarded = await AsyncStorage.getItem('@has_onboarded');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        if (onboarded === 'true') {
          setHasOnboarded(true);
        }
      } catch (e) {
        console.error('Failed to load user', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiClient.post(`/auth/login`, { email, password });
    const userData = res.data;
    setUser(userData);
    await AsyncStorage.setItem('@auth_user', JSON.stringify(userData));
    setHasOnboarded(true); // Assume existing user is onboarded
    await AsyncStorage.setItem('@has_onboarded', 'true');
  };

  const signup = async (name: string, email: string, password: string) => {
    const res = await apiClient.post(`/auth/signup`, { name, email, password });
    const userData = res.data;
    setUser(userData);
    await AsyncStorage.setItem('@auth_user', JSON.stringify(userData));
    setHasOnboarded(false); // New users need onboarding
    await AsyncStorage.removeItem('@has_onboarded');
  };

  const logout = async () => {
    setUser(null);
    setHasOnboarded(false);
    await AsyncStorage.removeItem('@auth_user');
    await AsyncStorage.removeItem('@has_onboarded');
  };

  const completeOnboarding = async () => {
    setHasOnboarded(true);
    await AsyncStorage.setItem('@has_onboarded', 'true');
  };

  const resetOnboarding = async () => {
    setHasOnboarded(false);
    await AsyncStorage.removeItem('@has_onboarded');
    await AsyncStorage.removeItem('@onboarding_draft'); // clear any old draft
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, hasOnboarded, login, signup, logout, completeOnboarding, resetOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
