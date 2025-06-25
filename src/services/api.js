import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Kreiranje axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor za dodavanje auth tokena
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth API
// Auth API
export const authAPI = {
  login: (credentials) => api.post('/api/auth/login', credentials),
};

// Equipment API
export const equipmentAPI = {
  getAll: () => api.get('/api/equipment'),
  getDisplay: () => api.get('/api/equipment/display'),
  getOne: (serialNumber) => api.get(`/api/equipment/${serialNumber}`),
  uploadExcel: (formData) => api.post('/api/equipment/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (serialNumber, data) => api.put(`/api/equipment/${serialNumber}`, data),
  delete: (serialNumber) => api.delete(`/api/equipment/${serialNumber}`),
};

// Materials API
export const materialsAPI = {
  getAll: () => api.get('/api/materials'),
  getOne: (id) => api.get(`/api/materials/${id}`),
  create: (data) => api.post('/api/materials', data),
  update: (id, data) => api.put(`/api/materials/${id}`, data),
  delete: (id) => api.delete(`/api/materials/${id}`),
};

// Technicians API
export const techniciansAPI = {
  getAll: () => api.get('/api/technicians'),
  getOne: (id) => api.get(`/api/technicians/${id}`),
  create: (data) => api.post('/api/technicians', data),
  update: (id, data) => api.put(`/api/technicians/${id}`, data),
  delete: (id) => api.delete(`/api/technicians/${id}`),
  changePassword: (id, data) => api.put(`/api/technicians/${id}/change-password`, data),
  getEquipment: (id) => api.get(`/api/technicians/${id}/equipment`),
  getMaterials: (id) => api.get(`/api/technicians/${id}/materials`),
  assignEquipment: (id, data) => api.post(`/api/technicians/${id}/equipment`, data),
  returnEquipment: (id, data) => api.post(`/api/technicians/${id}/equipment/return`, data),
  assignMaterial: (id, data) => api.post(`/api/technicians/${id}/materials`, data),
  returnMaterial: (id, data) => api.post(`/api/technicians/${id}/materials/return`, data),
};

// Work Orders API
export const workOrdersAPI = {
  getAll: () => api.get('/api/workorders'),
  getOne: (id) => api.get(`/api/workorders/${id}`),
  getTechnicianWorkOrders: (technicianId) => api.get(`/api/workorders/technician/${technicianId}`),
  getUnassigned: () => api.get('/api/workorders/unassigned'),
  createBulk: (formData) => api.post('/api/workorders/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  create: (data) => api.post('/api/workorders', data),
  update: (id, data) => api.put(`/api/workorders/${id}`, data),
  updateByTechnician: (id, data) => api.put(`/api/workorders/${id}/technician-update`, data),
  updateUsedMaterials: (id, data) => api.post(`/api/workorders/${id}/used-materials`, data),
  getWorkOrderMaterials: (id) => api.get(`/api/workorders/${id}/materials`),
  updateUsedEquipment: (id, data) => api.post(`/api/workorders/${id}/used-equipment`, data),
  delete: (id) => api.delete(`/api/workorders/${id}`),
  getStatistics: () => api.get('/api/workorders/statistics/summary'),
  getUserEquipment: (id) => api.get(`/api/workorders/${id}/user-equipment`),
};

export const userEquipmentAPI = {
  getAll: () => api.get('/api/user-equipment'),
  getForUser: (userId) => api.get(`/api/user-equipment/user/${userId}`),
  getUserHistory: (userId) => api.get(`/api/user-equipment/user/${userId}/history`),
  getForWorkOrder: (workOrderId) => api.get(`/api/user-equipment/workorder/${workOrderId}`),
  add: (data) => api.post('/api/user-equipment', data),
  remove: (id, data) => api.put(`/api/user-equipment/${id}/remove`, data),
};

export const exportAPI = {
  getPreview: (startDate, endDate) => api.get(`/api/export/preview?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`),
  exportSpecification: (data) => api.post('/api/export/specifikacija', data, {
    responseType: 'blob'
  }),
  exportTable: (data) => api.post('/api/export/tabela', data, {
    responseType: 'blob'
  }),
  exportUserEquipment: () => api.get('/api/export/userequipment', {
    responseType: 'blob'
  }),
  exportTemplate: () => api.get('/api/export/template', {
    responseType: 'blob'
  }),
};

// Interceptor za obradu grešaka
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Automatski odjavi korisnika ako dobijemo 401 Unauthorized
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;