import axios from 'axios';

const WA_BASE = 'http://localhost:3001/api/whatsapp';

export const getWhatsAppStatus = () => axios.get(`${WA_BASE}/status`);
export const getQRCode = () => axios.get(`${WA_BASE}/qr`);
export const sendSingle = (phone, message, meta = {}) => axios.post(`${WA_BASE}/send-single`, { phone, message, ...meta });
export const sendBulk = (customers) => axios.post(`${WA_BASE}/send-bulk`, { customers });
export const getSendLogs = () => axios.get(`${WA_BASE}/logs`);
export const clearSendLogs = () => axios.delete(`${WA_BASE}/logs`);
export const disconnectWhatsApp = () => axios.post(`${WA_BASE}/disconnect`);
