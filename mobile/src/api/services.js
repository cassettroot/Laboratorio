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

  getAuthStatus: async () => {
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

  createSubstance: async (data) => {
    const response = await apiClient.post('/api/substances', data);
    return response.data;
  },

  updateSubstance: async (id, data) => {
    const response = await apiClient.put(`/api/substances/${id}`, data);
    return response.data;
  },

  deleteSubstance: async (id) => {
    const response = await apiClient.delete(`/api/substances/${id}`);
    return response.data;
  },

  uploadPhoto: async (formData) => {
    const response = await apiClient.post('/api/upload-photo', formData, {
      headers: {
        'Accept': 'application/json',
      },
      transformRequest: (data, headers) => {
        if (headers) {
          delete headers['Content-Type'];
          delete headers['content-type'];
        }
        return data;
      },
    });
    return response.data;
  },

  // Materiales Químicos
  getChemicalMaterials: async () => {
    const response = await apiClient.get('/api/chemical-materials');
    return response.data;
  },

  createChemicalMaterial: async (data) => {
    const response = await apiClient.post('/api/chemical-materials', data);
    return response.data;
  },

  // Materiales Didácticos
  getDidacticMaterials: async () => {
    const response = await apiClient.get('/api/didactic-materials');
    return response.data;
  },

  createDidacticMaterial: async (data) => {
    const response = await apiClient.post('/api/didactic-materials', data);
    return response.data;
  },

  updateDidacticMaterial: async (id, data) => {
    const response = await apiClient.put(`/api/didactic-materials/${id}`, data);
    return response.data;
  },

  deleteDidacticMaterial: async (id) => {
    const response = await apiClient.delete(`/api/didactic-materials/${id}`);
    return response.data;
  },

  // Préstamos
  getLoans: async () => {
    const response = await apiClient.get('/api/loans');
    return response.data;
  },

  createLoan: async (data) => {
    const response = await apiClient.post('/api/loans', data);
    return response.data;
  },

  getRegisteredUsers: async () => {
    const response = await apiClient.get('/api/loans/registered-users');
    return response.data;
  },

  approveLoan: async (id) => {
    const response = await apiClient.post(`/api/loans/${id}/approve-loan`);
    return response.data;
  },

  rejectLoan: async (id, reason) => {
    const response = await apiClient.post(`/api/loans/${id}/reject-loan`, { reason });
    return response.data;
  },

  requestReturnLoan: async (id, formData) => {
    const response = await apiClient.post(`/api/loans/${id}/request-return`, formData, {
      headers: { 'Accept': 'application/json' },
      transformRequest: (data, headers) => {
        if (headers) {
          delete headers['Content-Type'];
          delete headers['content-type'];
        }
        return data;
      },
    });
    return response.data;
  },

  approveReturnLoan: async (id) => {
    const response = await apiClient.post(`/api/loans/${id}/approve-return`);
    return response.data;
  },

  rejectReturnLoan: async (id, reason) => {
    const response = await apiClient.post(`/api/loans/${id}/reject-return`, { reason });
    return response.data;
  },

  deleteLoan: async (id) => {
    const response = await apiClient.delete(`/api/loans/${id}`);
    return response.data;
  },

  processControlMayor: async (id, formData) => {
    const response = await apiClient.post(`/api/loans/${id}/control-mayor`, formData, {
      headers: { 'Accept': 'application/json' },
      transformRequest: (data, headers) => {
        if (headers) {
          delete headers['Content-Type'];
          delete headers['content-type'];
        }
        return data;
      },
    });
    return response.data;
  },

  getControlMayorRecords: async () => {
    const response = await apiClient.get('/api/loans/control-mayor-records');
    return response.data;
  },

  clearLoansHistory: async () => {
    const response = await apiClient.post('/api/loans/clear-history');
    return response.data;
  },

  // Escaneo de QR
  scanQR: async (qrContent) => {
    const response = await apiClient.post('/api/scan-qr', { qr_content: qrContent, qr_code: qrContent });
    return response.data;
  },

  // Historial de Cambios y Auditoría
  getHistory: async () => {
    const response = await apiClient.get('/api/history');
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
  },

  // Bienes y Equipos
  getEquipos: async () => {
    const response = await apiClient.get('/api/equipos');
    return response.data;
  },

  // Chequeo de Inventario
  getCheckList: async (category) => {
    const response = await apiClient.get(`/api/inventory-check/list?category=${category}`);
    return response.data;
  },

  resolveCheckScan: async (qrCode) => {
    const response = await apiClient.post('/api/inventory-check/scan', { qr_code: qrCode });
    return response.data;
  },

  addCheckStock: async (table, id, increment = 1) => {
    const response = await apiClient.post('/api/inventory-check/add-stock', { table, id, increment });
    return response.data;
  },

  saveCheckSession: async (category, total, checked, missingIds) => {
    const response = await apiClient.post('/api/inventory-check/save-session', {
      category, total, checked, missing_ids: missingIds
    });
    return response.data;
  },

  // Expose raw client for direct use
  client: apiClient
};
