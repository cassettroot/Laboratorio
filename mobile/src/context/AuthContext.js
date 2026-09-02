import React, { createContext, useState, useEffect, useRef } from 'react';
import { Vibration, Alert, AppState } from 'react-native';
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
  const [pendingLoansCount, setPendingLoansCount] = useState(0);
  const [syncSignal, setSyncSignal] = useState(0);
  const [floatingLoanAlert, setFloatingLoanAlert] = useState(null);
  const lastSyncRef = useRef({ pending_count: -1, total_max_id: -1, last_pending_id: -1, loans_pending_count: -1, last_loan_id: -1 });

  const dismissFloatingAlert = () => {
    setFloatingLoanAlert(null);
  };

  const checkAuthStatus = async () => {
    try {
      const savedUrl = await AsyncStorage.getItem('custom_server_url');
      if (savedUrl) {
        setServerUrl(savedUrl);
        apiClient.defaults.baseURL = savedUrl;
      }

      const storedUser = await AsyncStorage.getItem('user');
      const storedRole = await AsyncStorage.getItem('role');
      if (storedUser) {
        setUser(storedUser);
        setRole(storedRole || 'docente');
      }

      const res = await apiService.getAuthStatus();
      if (res && res.status === 'success' && res.logged_in) {
        setUser(res.user);
        setRole(res.role);
        await AsyncStorage.setItem('user', String(res.user));
        await AsyncStorage.setItem('role', String(res.role));
      } else if (!storedUser) {
        setUser(null);
        setRole(null);
      }
    } catch (error) {
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        console.warn('Verificación de sesión:', error.message);
      }
      setUser(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Sincronización en tiempo real ultra eficiente (se pausa automáticamente cuando la app está en segundo plano)
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    let intervalId = null;

    const performSyncCheck = async () => {
      if (!isMounted || AppState.currentState !== 'active') return;
      try {
        const res = await apiClient.get('/api/sync/status');
        if (res.data && res.data.status === 'success' && isMounted) {
          const { pending_count, total_max_id, last_pending_id, loans_pending_count, last_loan_id, latest_loan_info } = res.data;
          
          setPendingRequestsCount(pending_count || 0);
          setPendingLoansCount(loans_pending_count || 0);

          const prevState = lastSyncRef.current;

          if (prevState.pending_count === -1) {
            lastSyncRef.current = {
              pending_count,
              total_max_id,
              last_pending_id,
              loans_pending_count,
              last_loan_id,
              last_loan_status: latest_loan_info?.status || '',
              last_loan_activity: latest_loan_info?.last_activity || ''
            };
            return;
          }

          const hasNewRequest = last_pending_id > (prevState.last_pending_id || 0);
          const hasInventoryChange = total_max_id !== prevState.total_max_id;
          const hasLoanActivity = latest_loan_info && (
            latest_loan_info.last_activity !== prevState.last_loan_activity ||
            latest_loan_info.status !== prevState.last_loan_status
          );

          if (hasNewRequest || hasInventoryChange || hasLoanActivity) {
            lastSyncRef.current = {
              pending_count,
              total_max_id,
              last_pending_id,
              loans_pending_count,
              last_loan_id,
              last_loan_status: latest_loan_info?.status || '',
              last_loan_activity: latest_loan_info?.last_activity || ''
            };
            setSyncSignal(prev => prev + 1);

            try {
              Vibration.vibrate([0, 300, 150, 300]);
            } catch (e) {}

            if (hasLoanActivity && latest_loan_info) {
              const st = latest_loan_info.status;
              let title = '🔔 Notificación de Préstamos';
              let message = `Actualización en préstamo #PR-${latest_loan_info.id}`;

              if (st === 'Pendiente Aprobación Admin') {
                title = '⏳ Solicitud de Préstamo Recibida';
                message = `${latest_loan_info.borrower_name} solicitó: ${latest_loan_info.item_name}.`;
              } else if (st === 'Prestado') {
                title = '🟢 Préstamo Aprobado';
                message = `Se aprobó el préstamo de ${latest_loan_info.item_name}. El reloj de tiempo ha iniciado.`;
              } else if (st === 'Pendiente Verificación Admin') {
                title = '📷 Devolución Entregada';
                message = `${latest_loan_info.borrower_name} entregó la evidencia de devolución de ${latest_loan_info.item_name}.`;
              } else if (st === 'Devuelto') {
                title = '✅ Devolución Aprobada y Concluida';
                message = `Se verificó y concluyó la entrega de ${latest_loan_info.item_name}.`;
              } else if (st === 'Requiere Atención') {
                title = '⚠️ Devolución Con Observaciones';
                message = `El Administrador requiere atención en la entrega de ${latest_loan_info.item_name}.`;
              } else if (st === 'Rechazado') {
                title = '✕ Solicitud Rechazada';
                message = `La solicitud para ${latest_loan_info.item_name} fue rechazada por el Administrador.`;
              } else if (st === 'Control Mayor') {
                title = '🏛️ Cierre por Control Mayor';
                message = `El material ${latest_loan_info.item_name} concluyó su préstamo bajo resguardo especial.`;
              }

              setFloatingLoanAlert({
                title,
                message,
                count: loans_pending_count || 1,
                timestamp: Date.now()
              });
            }
          }
        }
      } catch (e) {}
    };

    const startPolling = () => {
      if (!intervalId) {
        performSyncCheck();
        intervalId = setInterval(performSyncCheck, 3500);
      }
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    startPolling();

    const appStateSub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        startPolling();
      } else {
        stopPolling();
      }
    });

    return () => {
      isMounted = false;
      stopPolling();
      appStateSub.remove();
    };
  }, [user, role]);

  const login = async (username, password) => {
    try {
      const res = await apiService.login(username, password);
      if (res && res.status === 'success') {
        const u = res.user || username;
        const r = res.role || 'docente';
        setUser(u);
        setRole(r);
        await AsyncStorage.setItem('user', String(u));
        await AsyncStorage.setItem('role', String(r));
        await checkAuthStatus();
        return { success: true };
      }
      return { success: false, message: res?.message || 'Error al iniciar sesión' };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, message: err.response?.data?.message || 'Error al conectar con el servidor' };
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (e) {}
    setUser(null);
    setRole(null);
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('role');
  };

  const updateServerUrl = async (newUrl) => {
    const cleanUrl = newUrl.replace(/\/+$/, '');
    await AsyncStorage.setItem('custom_server_url', cleanUrl);
    apiClient.defaults.baseURL = cleanUrl;
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
      pendingLoansCount,
      syncSignal,
      floatingLoanAlert,
      dismissFloatingAlert,
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
