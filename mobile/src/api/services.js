import apiClient from './client';

export const apiService = {
  // Autenticación
  login: async (username, password) => {
    const response = await apiClient.post('/api/auth/login', { username, password });
    return response.data;
  },
  
  logout: async () => {
    const response = await apiClient.post('/api/auth/logout');
    return response.data;
  },

  checkStatus: async () => {
    const response = await apiClient.get('/api/auth/status');
    return response.data;
  },

  // Sustancias Químicas
  getSubstances: async () => {
    const response = await apiClient.get('/api/substances');
    return response.data;
  },

  getSubstanceById: async (id) => {
    const response = await apiClient.get(`/api/substances/${id}`);
    return response.data;
  },

  // Materiales Químicos
  getChemicalMaterials: async () => {
    const response = await apiClient.get('/api/chemical-materials');
    return response.data;
  },

  // Materiales Didácticos
  getDidacticMaterials: async () => {
    const response = await apiClient.get('/api/didactic-materials');
    return response.data;
  },

  // Escaneo de QR
  scanQR: async (qrContent) => {
    const response = await apiClient.post('/api/scan-qr', { qr_content: qrContent });
    return response.data;
  },

  // Solicitudes de cambio
  getChangeRequests: async () => {
    const response = await apiClient.get('/api/change-requests');
    return response.data;
  },

  approveRequest: async (reqId) => {
    const response = await apiClient.post(`/api/change-requests/${reqId}/approve`);
    return response.data;
  },

  rejectRequest: async (reqId, feedback) => {
    const response = await apiClient.post(`/api/change-requests/${reqId}/reject`, { feedback });
    return response.data;
  }
};
