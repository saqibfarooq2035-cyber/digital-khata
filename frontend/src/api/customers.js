import api from './axios';

export const getCustomers = () => api.get('/customers');
export const createCustomer = (payload) => api.post('/customers', payload);
