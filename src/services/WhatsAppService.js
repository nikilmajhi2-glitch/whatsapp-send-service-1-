const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const config = require('../config/config');
const logger = require('../utils/logger');

class WhatsAppService {
  constructor(eventEmitter) {
    this.sock = null;
    this.isConnected = false;
    this.eventEmitter = eventEmitter;
  }

  async initialize() {
    try {
      const { state, saveCreds } = await useMultiFileAuthState(config.whatsapp.authDir);

      this.sock = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        printQRInTerminal: !config.whatsapp.usePairingCode,
        browser: config.whatsapp.browser
      });

      this.setupEventHandlers(saveCreds);

      // Handle pairing code
      if (config.whatsapp.usePairingCode && !this.sock.authState.creds.registered) {
        await this.requestPairingCode(config.whatsapp.phoneNumber);
      }

      logger.info('WhatsApp service initialized');
    } catch (error) {
      logger.error('Failed to initialize WhatsApp service:', error);
      throw error;
    }
  }

  setupEventHandlers(saveCreds) {
    // Connection updates
    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        logger.info('QR code generated');
        this.eventEmitter.emit('qr', qr);
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error instanceof Boom) &&
          lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut;

        logger.warn('Connection closed', { shouldReconnect });
        this.isConnected = false;
        this.eventEmitter.emit('status', { connected: false });

        if (shouldReconnect) {
          await this.initialize();
        }
      } else if (connection === 'open') {
        logger.info('WhatsApp connected successfully');
        this.isConnected = true;
        this.eventEmitter.emit('status', { connected: true, user: this.sock.user });
      }
    });

    // Save credentials
    this.sock.ev.on('creds.update', saveCreds);

    // Message updates
    this.sock.ev.on('messages.upsert', async ({ messages }) => {
      logger.debug('Message received', { from: messages[0]?.key?.remoteJid });
    });
  }

  async requestPairingCode(phoneNumber) {
    if (!phoneNumber) {
      throw new Error('Phone number is required for pairing code');
    }

    const code = await this.sock.requestPairingCode(phoneNumber);
    logger.info(`Pairing code generated: ${code}`);
    this.eventEmitter.emit('pairing_code', { code, phoneNumber });
    return code;
  }

  getSocket() {
    return this.sock;
  }

  isReady() {
    return this.isConnected;
  }
}

module.exports = WhatsAppService;
