import React, { createContext, useState, useEffect, useRef } from 'react';
import { Vibration, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../api/services';
import apiClient from '../api/client';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverUrl, setServerUrl] = useState('');
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [syncSignal, setSyncSignal] = useState(0);
  const lastSyncRef = useRef({ pending_count: -1, total_max_id: -1, last_pending_id: -1 });

  const checkAuthStatus = async () => {
    try {
      const savedUrl = await AsyncStorage.getItem('custom_server_url');
      if (savedUrl) setServerUrl(savedUrl);

      const res = await apiService.checkStatus();
      if (res.status === 'success' && res.logged_in) {
        setUser(res.user);
        setRole(res.role);
      } else {
        setUser('Estudiante');
        setRole('estudiante');
      }
    } catch (error) {
      console.log('Error de verificación de sesión:', error.message);
      setUser('Estudiante');
      setRole('estudiante');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get('/api/sync/status');
        if (res.data && res.data.status === 'success' && isMounted) {
          const { pending_count, total_max_id, last_pending_id } = res.data;
          
          setPendingRequestsCount(pending_count || 0);

          const prevState = lastSyncRef.current;

          if (prevState.pending_count === -1) {
            lastSyncRef.current = { pending_count, total_max_id, last_pending_id };
            return;
          }

          const hasNewRequest = last_pending_id > (prevState.last_pending_id || 0);
          const hasInventoryChange = total_max_id !== prevState.total_max_id;

          if (hasNewRequest || hasInventoryChange) {
            lastSyncRef.current = { pending_count, total_max_id, last_pending_id };
            setSyncSignal(prev => prev + 1);

            try {
              Vibration.vibrate([0, 250, 100, 250]);
            } catch (e) {}

            if (hasNewRequest && (role === 'admin' || role === 'jefe')) {
              Alert.alert(
                '🔔 Nueva Solicitud de Cambio',
                'Se ha registrado una nueva solicitud en el sistema pendiente de revisión.',
                [{ text: 'Entendido', style: 'default' }]
              );
            }
          }
        }
      } catch (e) {}
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user, role]);

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
      setUser('Estudiante');
      setRole('estudiante');
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
      pendingRequestsCount,
      syncSignal,
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
