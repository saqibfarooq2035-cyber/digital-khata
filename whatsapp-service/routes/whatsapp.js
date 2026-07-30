const express = require('express');
const { appendLog, readLogs, clearLogs } = require('../services/logStore');

const BULK_SEND_DELAY_MS = 3000;

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('92')) return digits;
  if (digits.startsWith('0')) return `92${digits.slice(1)}`;
  return `92${digits}`;
}

function toChatId(phone) {
  const normalized = normalizePhone(phone);
  return normalized ? `${normalized}@c.us` : null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = function createWhatsappRouter(client, state) {
  const router = express.Router();

  router.get('/status', (req, res) => {
    res.json({ connected: state.isConnected, phone: state.phone });
  });

  router.get('/qr', (req, res) => {
    res.json({ qr: state.qr });
  });

  router.post('/send-single', async (req, res) => {
    const { phone, message, customerName, messageType } = req.body || {};

    if (!phone || !message) {
      return res.status(400).json({ success: false, error: 'phone and message are required' });
    }

    if (!state.isConnected) {
      return res.status(503).json({ success: false, error: 'WhatsApp is not connected. Scan the QR code first.' });
    }

    const chatId = toChatId(phone);

    try {
      await client.sendMessage(chatId, message);
      appendLog({ phone: normalizePhone(phone), message, customerName, messageType, status: 'sent' });
      return res.json({ success: true });
    } catch (error) {
      appendLog({ phone: normalizePhone(phone), message, customerName, messageType, status: 'failed', error: error.message });
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/send-bulk', async (req, res) => {
    const { customers } = req.body || {};

    if (!Array.isArray(customers) || customers.length === 0) {
      return res.status(400).json({ success: false, error: 'customers must be a non-empty array of { phone, message }' });
    }

    if (!state.isConnected) {
      return res.status(503).json({ success: false, error: 'WhatsApp is not connected. Scan the QR code first.' });
    }

    const results = [];

    for (const customer of customers) {
      const { phone, message, customerName, messageType } = customer || {};

      if (!phone || !message) {
        results.push({ phone, success: false, error: 'phone and message are required' });
        continue;
      }

      const chatId = toChatId(phone);

      try {
        await client.sendMessage(chatId, message);
        appendLog({ phone: normalizePhone(phone), message, customerName, messageType, status: 'sent' });
        results.push({ phone: normalizePhone(phone), success: true });
      } catch (error) {
        appendLog({ phone: normalizePhone(phone), message, customerName, messageType, status: 'failed', error: error.message });
        results.push({ phone: normalizePhone(phone), success: false, error: error.message });
      }

      await sleep(BULK_SEND_DELAY_MS);
    }

    const sent = results.filter((r) => r.success).length;
    const failed = results.length - sent;

    return res.json({ success: true, sent, failed, results });
  });

  router.get('/logs', (req, res) => {
    res.json({ logs: readLogs().slice(0, 100) });
  });

  router.delete('/logs', (req, res) => {
    clearLogs();
    res.json({ success: true });
  });

  router.post('/disconnect', async (req, res) => {
    try {
      await client.logout();
      state.isConnected = false;
      state.phone = null;
      state.qr = null;
      res.json({ success: true });
      client.initialize();
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};
