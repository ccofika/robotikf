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
export const authAPI = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  refresh: () => api.post('/api/auth/refresh-token'),
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

// Basic Equipment API
export const basicEquipmentAPI = {
  getAll: () => api.get('/api/basic-equipment'),
  getOne: (id) => api.get(`/api/basic-equipment/${id}`),
  create: (data) => api.post('/api/basic-equipment', data),
  update: (id, data) => api.put(`/api/basic-equipment/${id}`, data),
  delete: (id) => api.delete(`/api/basic-equipment/${id}`),
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
  getBasicEquipment: (id) => api.get(`/api/technicians/${id}/basic-equipment`),
  assignBasicEquipment: (id, data) => api.post(`/api/technicians/${id}/basic-equipment`, data),
  returnBasicEquipment: (id, data) => api.post(`/api/technicians/${id}/basic-equipment/return`, data),
  // Nove funkcije za potvrđivanje opreme
  getPendingEquipment: (id) => api.get(`/api/technicians/${id}/equipment/pending`),
  confirmEquipment: (id, data) => api.post(`/api/technicians/${id}/equipment/confirm`, data),
  rejectEquipment: (id, data) => api.post(`/api/technicians/${id}/equipment/reject`, data),
};

// Work Orders API
export const workOrdersAPI = {
  getAll: () => api.get('/api/workorders'),
  getOne: (id) => api.get(`/api/workorders/${id}`),
  getTechnicianWorkOrders: (technicianId) => api.get(`/api/workorders/technician/${technicianId}`),
  getTechnicianOverdueWorkOrders: (technicianId) => api.get(`/api/workorders/technician/${technicianId}/overdue`),
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

// Logs API
export const logsAPI = {
  getTechnicianLogs: (params) => api.get('/api/logs/technicians', { params }),
  getUserLogs: (params) => api.get('/api/logs/users', { params }),
  getActions: () => api.get('/api/logs/actions'),
  getStatistics: () => api.get('/api/logs/statistics'),
  // Dashboard API functions
  getDashboardKPI: (params) => api.get('/api/logs/dashboard/kpi', { params }),
  getDashboardCharts: (params) => api.get('/api/logs/dashboard/charts', { params }),
  getDashboardTables: (params) => api.get('/api/logs/dashboard/tables', { params }),
  getDashboardFilters: () => api.get('/api/logs/dashboard/filters'),
  // Map and Travel Analytics API functions
  getMapData: (params) => api.get('/api/logs/dashboard/map-data', { params }),
  getTravelAnalytics: (params) => api.get('/api/logs/dashboard/travel-analytics', { params }),
  // Admin dismiss functionality
  dismissWorkOrder: (workOrderId) => api.post('/api/logs/dashboard/dismiss-work-order', { workOrderId }),
  getDismissedWorkOrders: () => api.get('/api/logs/dashboard/dismissed-work-orders'),
  readdWorkOrder: (workOrderId) => api.delete(`/api/logs/dashboard/dismiss-work-order/${workOrderId}`),
};

export const userEquipmentAPI = {
  getAll: () => api.get('/api/user-equipment'),
  getForUser: (userId) => api.get(`/api/user-equipment/user/${userId}`),
  getUserHistory: (userId) => api.get(`/api/user-equipment/user/${userId}/history`),
  getForWorkOrder: (workOrderId) => api.get(`/api/user-equipment/workorder/${workOrderId}`),
  getRemovedForWorkOrder: (workOrderId) => api.get(`/api/user-equipment/workorder/${workOrderId}/removed`),
  add: (data) => api.post('/api/user-equipment', data),
  remove: (id, data) => api.put(`/api/user-equipment/${id}/remove`, data),
  removeBySerial: (data) => api.post('/api/user-equipment/remove-by-serial', data),
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

// Vehicles API
export const vehiclesAPI = {
  getAll: () => api.get('/api/vehicles'),
  getAllWithStatus: () => api.get('/api/vehicles/with-status'),
  getExpiringRegistrations: (days) => api.get(`/api/vehicles/expiring-registrations/${days || 30}`),
  getOne: (id) => api.get(`/api/vehicles/${id}`),
  getServices: (id) => api.get(`/api/vehicles/${id}/services`),
  create: (data) => api.post('/api/vehicles', data),
  update: (id, data) => api.put(`/api/vehicles/${id}`, data),
  delete: (id) => api.delete(`/api/vehicles/${id}`),
  addService: (id, data) => api.post(`/api/vehicles/${id}/services`, data),
  updateService: (id, serviceId, data) => api.put(`/api/vehicles/${id}/services/${serviceId}`, data),
  deleteService: (id, serviceId) => api.delete(`/api/vehicles/${id}/services/${serviceId}`),
  getStats: () => api.get('/api/vehicles/stats/overview'),
};

// Token utility funkcije
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
};

// Queue management za multiple refresh requests
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Interceptor za automatski refresh tokena sa proper queue management
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Provjeri da li je 401 error i da request nije već retry-an
    if (error.response?.status === 401 && !originalRequest._retry) {

      // Ako je refresh već u toku, dodaj request u queue
      if (isRefreshing) {
        console.log('🔄 Token refresh in progress, queueing request...');
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject: (err) => {
              reject(err);
            }
          });
        });
      }

      console.log('🔄 Starting token refresh process...');
      originalRequest._retry = true;
      isRefreshing = true;

      const token = localStorage.getItem('token');

      if (!token) {
        console.log('❌ No token found, redirecting to login');
        isRefreshing = false;
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        console.log('🔄 Calling refresh token API...');
        const response = await authAPI.refresh();
        const { token: newToken, user } = response.data;

        console.log('✅ Token refreshed successfully');

        // Ažuriraj token u localStorage i axios defaults
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(user));
        api.defaults.headers.Authorization = `Bearer ${newToken}`;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        // Processi queue sa novim tokenon
        processQueue(null, newToken);

        console.log('🔄 Retrying original request...');
        return api(originalRequest);

      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);

        // Processi queue sa greškom
        processQueue(refreshError, null);

        // Odjavi korisnika i preusmeri na login
        localStorage.removeItem('user');
        localStorage.removeItem('token');

        // Provjeri da li nije već na login stranici da izbjegne beskonačnu petlju
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Finances API
export const financesAPI = {
  getSettings: () => api.get('/api/finances/settings'),
  saveSettings: (data) => api.post('/api/finances/settings', data),
  getMunicipalities: () => api.get('/api/finances/municipalities'),
  getCustomerStatusOptions: () => api.get('/api/finances/customer-status-options'),
  getTechnicians: () => api.get('/api/finances/technicians'),
  getReports: (params) => api.get('/api/finances/reports', { params }),
  getFailedTransactions: () => api.get('/api/finances/failed-transactions'),
  retryFailedTransaction: (workOrderId) => api.post(`/api/finances/retry-failed-transaction/${workOrderId}`),
  dismissFailedTransaction: (workOrderId) => api.delete(`/api/finances/failed-transaction/${workOrderId}`),
  confirmDiscount: (data) => api.post('/api/finances/confirm-discount', data),
};

export default api;