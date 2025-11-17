require('dotenv').config();

module.exports = {
  server: {
    port: process.env.PORT || 8080,
    env: process.env.NODE_ENV || 'development'
  },
  whatsapp: {
    usePairingCode: process.env.USE_PAIRING_CODE === 'true',
    phoneNumber: process.env.PHONE_NUMBER || null,
    authDir: './auth_info_baileys',
    browser: ['WhatsApp Send Service', 'Chrome', '1.0.0']
  },
  websocket: {
    port: process.env.WS_PORT || 8080
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log'
  }
};
