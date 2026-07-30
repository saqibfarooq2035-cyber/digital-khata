import api from './axios';

export const getPortalDashboard = () => api.get('/portal/dashboard');
export const getPortalPayments = () => api.get('/portal/payments');
export const getPortalSchedule = () => api.get('/portal/schedule');
export const getPortalReceipts = () => api.get('/portal/receipts');
export const getPortalReceipt = (id) => api.get(`/portal/receipt/${id}`);
