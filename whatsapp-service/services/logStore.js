const fs = require('fs');
const path = require('path');

const LOGS_PATH = path.join(__dirname, '..', 'logs.json');

function readLogs() {
  try {
    const raw = fs.readFileSync(LOGS_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function appendLog(entry) {
  const logs = readLogs();
  logs.unshift({ id: Date.now() + Math.random().toString(36).slice(2, 8), timestamp: new Date().toISOString(), ...entry });
  fs.writeFileSync(LOGS_PATH, JSON.stringify(logs.slice(0, 500), null, 2));
}

function clearLogs() {
  fs.writeFileSync(LOGS_PATH, '[]');
}

module.exports = { readLogs, appendLog, clearLogs };
