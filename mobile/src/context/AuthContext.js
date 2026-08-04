import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../api/services';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverUrl, setServerUrl] = useState('');

  const checkAuthStatus = async () => {
    try {
      const savedUrl = await AsyncStorage.getItem('custom_server_url');
      if (savedUrl) setServerUrl(savedUrl);

      const res = await apiService.checkStatus();
      if (res.status === 'success' && res.logged_in) {
        setUser(res.user);
        setRole(res.role);
      } else {
        setUser(null);
        setRole(null);
      }
    } catch (error) {
      console.log('Error de verificación de sesión:', error.message);
      setUser(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = async (username, password) => {
    const res = await apiService.login(username, password);
    if (res.status === 'success') {
      await checkAuthStatus();
      return { success: true };
    }
    return { success: false, message: res.message || 'Error al iniciar sesión' };
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (e) {
      console.warn("Logout error:", e);
    } finally {
      setUser(null);
      setRole(null);
    }
  };

  const updateServerUrl = async (newUrl) => {
    const cleanUrl = newUrl.replace(/\/+$/, '');
    await AsyncStorage.setItem('custom_server_url', cleanUrl);
    setServerUrl(cleanUrl);
    await checkAuthStatus();
  };

  const loginAsStudent = () => {
    setUser('Estudiante');
    setRole('estudiante');
  };

  return (
    <AuthContext.Provider value={{
      user,
      role,
      loading,
      serverUrl,
      login,
      logout,
      loginAsStudent,
      updateServerUrl,
      checkAuthStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
};
