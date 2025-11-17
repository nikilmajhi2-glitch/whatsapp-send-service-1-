const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const { Boom } = require('@hapi/boom');
const config = require('../config/config');
const logger = require('../utils/logger');

class WhatsAppService {
  constructor(eventEmitter) {
    this.sock = null;
    this.isConnected = false;
    this.eventEmitter = eventEmitter;
    this.pairingCodeRequested = false;
  }
  
  async initialize() {
    try {
      const { state, saveCreds } = await useMultiFileAuthState(config.whatsapp.authDir);
      
      // Fetch latest baileys version
      const { version } = await fetchLatestBaileysVersion();
      logger.info(`Using Baileys version ${version.join('.')}`);
      
      this.sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        printQRInTerminal: false,
        browser: ['Chrome (Linux)', 'Chrome', '121.0.0'],
        syncFullHistory: false,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        getMessage: async () => undefined
      });
      
      this.setupEventHandlers(saveCreds);
      
      // =======================================
      // REQUEST PAIRING CODE IMMEDIATELY IF CONFIGURED
      // =======================================
      if (
        config.whatsapp.usePairingCode &&
        config.whatsapp.phoneNumber &&
        !state.creds.registered
      ) {
        logger.info('Pairing code mode enabled, requesting code...');
        
        // Wait a moment for socket to be ready
        setTimeout(async () => {
          try {
            await this.requestPairingCode(config.whatsapp.phoneNumber);
          } catch (err) {
            logger.error('Failed to request pairing code:', err);
          }
        }, 2000);
      }
      
      logger.info('WhatsApp service initialized');
    } catch (error) {
      logger.error('Failed to initialize WhatsApp service:', error);
      throw error;
    }
  }
  
  setupEventHandlers(saveCreds) {
    
    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      // =======================================
      // SUPPRESS QR CODE IF PAIRING MODE IS ENABLED
      // =======================================
      if (qr && !config.whatsapp.usePairingCode) {
        logger.info('QR code generated');
        
        console.log('\n' + '='.repeat(70));
        console.log('📱  SCAN THIS QR CODE WITH WHATSAPP');
        console.log('='.repeat(70));
        console.log('👉 Open WhatsApp → Settings → Linked Devices → Link Device');
        console.log('='.repeat(70) + '\n');
        
        const qrcode = require('qrcode-terminal');
        qrcode.generate(qr, { small: true });
        
        console.log('\n' + '='.repeat(70));
        console.log('Waiting for scan...');
        console.log('='.repeat(70) + '\n');
        
        this.eventEmitter.emit('qr', qr);
      } else if (qr && config.whatsapp.usePairingCode) {
        logger.info('QR generated but suppressed (pairing code mode)');
      }
      
      // =======================================
      // WHEN CONNECTION CLOSES
      // =======================================
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const reason = lastDisconnect?.error?.output?.payload?.message;
        
        const shouldReconnect =
          lastDisconnect?.error instanceof Boom &&
          statusCode !== DisconnectReason.loggedOut;
        
        logger.warn('Connection closed', { statusCode, reason, shouldReconnect });
        
        this.isConnected = false;
        this.pairingCodeRequested = false;
        
        this.eventEmitter.emit('status', { connected: false });
        
        if (shouldReconnect) {
          const delay = statusCode === 428 ? 30000 : 8000;
          logger.info(`Reconnecting in ${delay/1000} seconds...`);
          setTimeout(() => this.initialize(), delay);
        } else {
          logger.error('❌ Connection closed permanently. Logged out.');
          
          if (statusCode === DisconnectReason.loggedOut) {
            console.log('\n⚠️  You are logged out from WhatsApp.');
            console.log('Delete auth_info_baileys folder and restart.\n');
          }
        }
      }
      
      // =======================================
      // WHEN CONNECTED TO WHATSAPP
      // =======================================
      else if (connection === 'open') {
        logger.info('✅ WhatsApp connected successfully');
        this.isConnected = true;
        
        console.log('\n' + '='.repeat(70));
        console.log('🎉  WHATSAPP CONNECTED SUCCESSFULLY!!');
        console.log('='.repeat(70));
        console.log('User:', this.sock.user?.name || 'Unknown');
        console.log('Phone:', this.sock.user?.id?.split(':')[0] || 'Unknown');
        console.log('='.repeat(70) + '\n');
        
        this.eventEmitter.emit('status', { connected: true, user: this.sock.user });
      }
      
      // =======================================
      // CONNECTING
      // =======================================
      else if (connection === 'connecting') {
        console.log('🔄 Connecting to WhatsApp...');
      }
    });
    
    // Save updated creds
    this.sock.ev.on('creds.update', saveCreds);
    
    // Log incoming messages
    this.sock.ev.on('messages.upsert', async ({ messages }) => {
      logger.debug('Message received', {
        from: messages[0]?.key?.remoteJid,
        text: messages[0]?.message?.conversation
      });
    });
  }
  
  // =======================================
  // REQUEST PAIRING CODE (FOR PHONE NUMBER LOGIN)
  // =======================================
  async requestPairingCode(phoneNumber) {
    try {
      if (!phoneNumber) throw new Error('Phone number required');
      
      // Clean phone number (remove spaces, dashes, etc.)
      const cleanNumber = phoneNumber.replace(/[^\d]/g, '');
      
      logger.info(`Requesting pairing code for ${cleanNumber}...`);
      
      const code = await this.sock.requestPairingCode(cleanNumber);
      logger.info(`Pairing code generated: ${code}`);
      
      console.log('\n' + '='.repeat(70));
      console.log('📱 PAIRING CODE:', code);
      console.log('='.repeat(70));
      console.log('🔧 Enter this code in WhatsApp:');
      console.log('1. Open WhatsApp on your phone');
      console.log('2. Go to Settings → Linked Devices');
      console.log('3. Tap "Link a Device"');
      console.log('4. Tap "Link with phone number instead"');
      console.log('5. Enter the code above');
      console.log('='.repeat(70) + '\n');
      
      this.eventEmitter.emit('pairing_code', { code, phoneNumber: cleanNumber });
      this.pairingCodeRequested = true;
      
      return code;
    } catch (err) {
      logger.error('Failed to request pairing code:', err);
      throw err;
    }
  }
  
  getSocket() {
    return this.sock;
  }
  
  isReady() {
    return this.isConnected;
  }
}

module.exports = WhatsAppService;