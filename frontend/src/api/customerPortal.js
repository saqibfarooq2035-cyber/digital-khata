import api from './axios';

export const createCustomerLogin = (customerId, data) => api.post(`/customers/${customerId}/create-login`, data);
export const resetCustomerPassword = (customerId, newPassword) => api.put(`/customers/${customerId}/reset-password`, { newPassword });
export const removeCustomerLogin = (customerId) => api.delete(`/customers/${customerId}/remove-login`);
export const getLoginStatus = (customerId) => api.get(`/customers/${customerId}/login-status`);
