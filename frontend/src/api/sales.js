import api from './axios';

export const getSales = () => api.get('/sales');
export const createSale = (payload) => api.post('/sales', payload);
