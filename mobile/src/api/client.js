import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

export const DEFAULT_API_BASE = 'http://10.0.2.2:5000'; // IP por defecto para Emulador de Android en Windows

export const getDevServerIpUrl = () => {
  try {
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return `http://${ip}:5000`;
      }
    }
  } catch (e) {}
  return DEFAULT_API_BASE;
};

const apiClient = axios.create({
  baseURL: getDevServerIpUrl(),
  timeout: 12000,
  withCredentials: true, // Importante para preservar la cookie de sesión de Flask
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Interceptor para inyectar la URL base configurada por el usuario desde la app
apiClient.interceptors.request.use(async (config) => {
  try {
    const customUrl = await AsyncStorage.getItem('custom_server_url');
    if (customUrl) {
      config.baseURL = customUrl;
      apiClient.defaults.baseURL = customUrl;
    } else {
      const devUrl = getDevServerIpUrl();
      config.baseURL = devUrl;
      apiClient.defaults.baseURL = devUrl;
    }
  } catch (e) {
    console.warn("No se pudo leer custom_server_url:", e);
  }
  return config;
}, (error) => Promise.reject(error));

export const getImageUrl = (imagePath, customServerUrl = '') => {
  if (!imagePath) return null;
  if (typeof imagePath !== 'string') return null;
  const trimmed = imagePath.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('file://') || trimmed.startsWith('data:')) return trimmed;

  const base = customServerUrl || apiClient.defaults.baseURL || getDevServerIpUrl();
  const cleanBase = base.replace(/\/+$/, '');
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${cleanBase}${cleanPath}`;
};

export default apiClient;
