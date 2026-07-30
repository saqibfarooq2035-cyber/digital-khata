const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');

const state = require('./services/state');
const createWhatsappRouter = require('./routes/whatsapp');

const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGINS = ['http://localhost:5173', 'http://localhost:5000'];

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  },
});

client.on('qr', async (qr) => {
  console.log('WhatsApp QR code received — scan it from the frontend or terminal.');
  try {
    state.qr = await qrcode.toDataURL(qr);
  } catch (error) {
    console.error('Failed to generate QR data URL:', error.message);
  }
});

client.on('ready', () => {
  state.isConnected = true;
  state.qr = null;
  state.phone = client.info?.wid?.user || null;
  console.log(`WhatsApp client ready. Connected as ${state.phone}`);
});

client.on('disconnected', (reason) => {
  state.isConnected = false;
  state.phone = null;
  console.warn('WhatsApp client disconnected:', reason);
});

client.initialize();

const app = express();

app.use(
  cors({
    origin: ALLOWED_ORIGINS,
  })
);
app.use(express.json());

app.use('/api/whatsapp', createWhatsappRouter(client, state));

app.listen(PORT, () => {
  console.log(`WhatsApp microservice listening on port ${PORT}`);
});
