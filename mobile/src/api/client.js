import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Reemplazar con la dirección IP local de la computadora donde corre el servidor Flask en desarrollo
// Ejemplo en red local WiFi: 'http://192.168.1.100:5000'
// En servidor de producción: 'https://midominio.com'
export const DEFAULT_API_BASE = 'http://10.0.2.2:5000'; // IP por defecto para Emulador de Android en Windows

const apiClient = axios.create({
  baseURL: DEFAULT_API_BASE,
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
    }
  } catch (e) {
    console.warn("No se pudo leer custom_server_url:", e);
  }
  return config;
}, (error) => Promise.reject(error));

export const getImageUrl = (imagePath, customServerUrl = '') => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;

  const base = customServerUrl || apiClient.defaults.baseURL || DEFAULT_API_BASE;
  const cleanBase = base.replace(/\/+$/, '');
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${cleanBase}${cleanPath}`;
};

export default apiClient;
