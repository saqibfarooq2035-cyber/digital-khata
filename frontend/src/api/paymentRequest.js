import api from './axios';

export const getShopAccounts = () => api.get('/payment-requests/shop-accounts');

export const submitPaymentRequest = (formData) =>
  api.post('/payment-requests/submit', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getMyRequests = () => api.get('/payment-requests/my-requests');

// Admin/Staff
export const getPendingRequests = () => api.get('/payment-requests/pending');

export const getAllRequests = (params) => api.get('/payment-requests/all', { params });

export const approvePaymentRequest = (id) => api.post(`/payment-requests/${id}/approve`);

export const rejectPaymentRequest = (id, reason) => api.post(`/payment-requests/${id}/reject`, { reason });
