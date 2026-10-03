// API za Robotik Security (koristi zajedničku axios instancu sa tokenom i osvežavanjem tokena)
import api from '../services/api';

export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
export const fileUrl = (u) => (u && u.startsWith('/') ? `${API_URL}${u}` : u);

const d = (p) => p.then((r) => r.data);

// Poruka greške sa servera, spremna za prikaz
export const errText = (e, fallback = 'Nešto nije uspelo. Pokušaj ponovo.') =>
  (e && e.response && e.response.data && (e.response.data.error || e.response.data.message)) || (e && e.message && !/status code/i.test(e.message) ? e.message : fallback);
export const errCode = (e) => e && e.response && e.response.data && e.response.data.code;
export const errData = (e) => (e && e.response && e.response.data) || {};

export const sec = {
  live: () => d(api.get('/api/security/live')),

  facilities: (params) => d(api.get('/api/security/facilities', { params })),
  facility: (id) => d(api.get(`/api/security/facilities/${id}`)),
  createFacility: (data) => d(api.post('/api/security/facilities', data)),
  updateFacility: (id, data) => d(api.put(`/api/security/facilities/${id}`, data)),
  archiveFacility: (id, force) => d(api.post(`/api/security/facilities/${id}/archive`, { force })),
  restoreFacility: (id) => d(api.post(`/api/security/facilities/${id}/restore`)),
  setPeople: (id, role, workerIds) => d(api.put(`/api/security/facilities/${id}/people`, { role, workerIds })),
  // dodaje ili skida samo navedene radnike (ne ceo spisak sa strane, koji je možda zastareo)
  changePeople: (id, role, { add = [], remove = [] }) => d(api.put(`/api/security/facilities/${id}/people`, { role, add, remove })),
  setRoundPlan: (id, plan) => d(api.put(`/api/security/facilities/${id}/round-plan`, plan)),
  setStandingTasks: (id, tasks) => d(api.put(`/api/security/facilities/${id}/standing-tasks`, { tasks })),
  setReportEmails: (id, emails) => d(api.put(`/api/security/facilities/${id}/report-emails`, { emails })),

  tags: (params) => d(api.get('/api/security/tags', { params })),
  unknownTags: () => d(api.get('/api/security/tags/unknown')),
  dismissUnknown: (uid) => d(api.post(`/api/security/tags/unknown/${encodeURIComponent(uid)}/dismiss`)),
  lookupTag: (uid) => d(api.get(`/api/security/tags/lookup/${encodeURIComponent(uid)}`)),
  createTag: (data) => d(api.post('/api/security/tags', data)),
  updateTag: (id, data) => d(api.put(`/api/security/tags/${id}`, data)),
  replaceTag: (id, data) => d(api.post(`/api/security/tags/${id}/replace`, data)),
  retireTag: (id, reason) => d(api.post(`/api/security/tags/${id}/retire`, { reason })),
  reactivateTag: (id, data) => d(api.post(`/api/security/tags/${id}/reactivate`, data || {})),
  setTagNdef: (id, data) => d(api.put(`/api/security/tags/${id}/ndef`, data)),
  deleteTag: (id) => d(api.delete(`/api/security/tags/${id}`)),

  workers: (params) => d(api.get('/api/security/workers', { params })),
  worker: (id) => d(api.get(`/api/security/workers/${id}`)),
  createWorker: (data) => d(api.post('/api/security/workers', data)),
  updateWorker: (id, data) => d(api.put(`/api/security/workers/${id}`, data)),
  setWorkerActive: (id, isActive) => d(api.put(`/api/security/workers/${id}/active`, { isActive })),
  addLicense: (id, form) => d(api.post(`/api/security/workers/${id}/licenses`, form, { headers: { 'Content-Type': 'multipart/form-data' } })),
  updateLicense: (id, lid, form) => d(api.put(`/api/security/workers/${id}/licenses/${lid}`, form, { headers: { 'Content-Type': 'multipart/form-data' } })),
  deleteLicense: (id, lid) => d(api.delete(`/api/security/workers/${id}/licenses/${lid}`)),
  addDocument: (id, form) => d(api.post(`/api/security/workers/${id}/documents`, form, { headers: { 'Content-Type': 'multipart/form-data' } })),
  deleteDocument: (id, did) => d(api.delete(`/api/security/workers/${id}/documents/${did}`)),
  workerFile: (id, fileId) => api.get(`/api/security/workers/${id}/files/${fileId}`, { responseType: 'blob' }),
  addDossierNote: (id, text) => d(api.post(`/api/security/workers/${id}/dossier`, { text })),

  shifts: (params) => d(api.get('/api/security/shifts', { params })),
  shift: (id) => d(api.get(`/api/security/shifts/${id}`)),
  createShift: (data) => d(api.post('/api/security/shifts', data)),
  bulkShifts: (items, force) => d(api.post('/api/security/shifts/bulk', { items, force })),
  updateShift: (id, data) => d(api.put(`/api/security/shifts/${id}`, data)),
  deleteShift: (id) => d(api.delete(`/api/security/shifts/${id}`)),
  publishShifts: (data) => d(api.post('/api/security/shifts/publish', data)),
  manualPunch: (id, data) => d(api.post(`/api/security/shifts/${id}/manual`, data)),
  reviewShift: (id, data) => d(api.put(`/api/security/shifts/${id}/review`, data)),

  alarms: (params) => d(api.get('/api/security/alarms', { params })),
  ackAlarm: (id) => d(api.post(`/api/security/alarms/${id}/ack`)),
  resolveAlarm: (id, note) => d(api.post(`/api/security/alarms/${id}/resolve`, { note })),

  tasks: (params) => d(api.get('/api/security/tasks', { params })),
  createTask: (data) => d(api.post('/api/security/tasks', data)),
  updateTask: (id, data) => d(api.put(`/api/security/tasks/${id}`, data)),
  cancelTask: (id) => d(api.delete(`/api/security/tasks/${id}`)),

  reports: (params) => d(api.get('/api/security/reports', { params })),
  report: (shiftId) => d(api.get(`/api/security/reports/${shiftId}`)),
  reportPdf: (shiftId) => api.get(`/api/security/reports/${shiftId}/pdf`, { responseType: 'blob' }),
  sendReport: (shiftId, emails) => d(api.post(`/api/security/reports/${shiftId}/send`, { emails })),

  timesheet: (params) => d(api.get('/api/security/timesheets', { params })),
  setRate: (workerId, hourlyRate) => d(api.put('/api/security/timesheets/rate', { workerId, hourlyRate })),

  settings: () => d(api.get('/api/security/settings')),
  saveSettings: (data) => d(api.put('/api/security/settings', data)),
  holidays: (year) => d(api.get('/api/security/settings/holidays', { params: { year } })),

  // obaveštenja (zajednička ruta aplikacije)
  notifications: () => d(api.get('/api/notifications')),
  markRead: (id) => d(api.put(`/api/notifications/${id}/read`)),
  markAllRead: () => d(api.put('/api/notifications/mark-all-read')),

  // radnik obezbeđenja na webu
  meCurrent: () => d(api.get('/api/security/me/current')),
  meShifts: () => d(api.get('/api/security/me/shifts')),
  meScan: (data) => d(api.post('/api/security/me/scans', data)),
  meStanding: (shiftId, taskId, comment) => d(api.post(`/api/security/me/shifts/${shiftId}/standing/${taskId}`, { comment })),
  meStandingUndo: (shiftId, taskId) => d(api.delete(`/api/security/me/shifts/${shiftId}/standing/${taskId}`)),
  meTaskDone: (taskId, form) => d(api.post(`/api/security/me/tasks/${taskId}/done`, form, { headers: { 'Content-Type': 'multipart/form-data' } })),
  meSnooze: (alarmId, reason) => d(api.post(`/api/security/me/alarms/${alarmId}/snooze`, { reason })),
  meNote: (shiftId, form) => d(api.post(`/api/security/me/shifts/${shiftId}/notes`, form, { headers: { 'Content-Type': 'multipart/form-data' } })),
  mePowers: () => d(api.get('/api/security/me/powers'))
};
