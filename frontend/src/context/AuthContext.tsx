import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthState } from '../types';
import api from '../services/api';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEYS = {
  TOKEN: '@delivio_token',
  USER: '@delivio_user',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [token, userJson] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.USER),
      ]);

      if (token && userJson) {
        const user = JSON.parse(userJson) as User;
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setState({
          token,
          user,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Error loading auth:', error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user_type, user_id, email: userEmail, name } = response.data;

      if (user_type !== 'rider') {
        return { success: false, error: 'This app is only for riders' };
      }

      const user: User = {
        id: user_id,
        email: userEmail,
        name,
        user_type,
      };

      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token),
        AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user)),
      ]);

      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      setState({
        token,
        user,
        isLoading: false,
        isAuthenticated: true,
      });

      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Invalid credentials';
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.USER),
      ]);
      delete api.defaults.headers.common['Authorization'];
      setState({
        token: null,
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
