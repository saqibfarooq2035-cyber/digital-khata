import api from './axios';

export const getProducts = () => api.get('/products');
export const createProduct = (payload) => api.post('/products', payload);
