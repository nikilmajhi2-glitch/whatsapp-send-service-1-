const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion
} = require('baileys');

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
      
      // Request custom pairing code if configured
      if (
        config.whatsapp.usePairingCode &&
        config.whatsapp.phoneNumber &&
        !state.creds.registered
      ) {
        logger.info('⏳ Waiting for connection to request custom pairing code...');
        
        // Wait for connection
        await this.waitForConnection();
        
        logger.info('✅ Connection ready, requesting custom pairing code...');
        
        setTimeout(async () => {
          try {
            await this.requestCustomPairingCode(
              config.whatsapp.phoneNumber,
              config.whatsapp.customPairingCode || '44444444'
            );
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
  
  async waitForConnection(timeout = 15000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (this.sock && this.sock.ws && this.sock.ws.readyState === 1) {
          clearInterval(checkInterval);
          logger.info('WebSocket connection established');
          resolve();
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          logger.warn('Timeout waiting for connection');
          resolve();
        }
      }, 200);
    });
  }
  
  setupEventHandlers(saveCreds) {
    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      // Suppress QR if using pairing code
      if (qr && config.whatsapp.usePairingCode) {
        logger.debug('QR code suppressed (using custom pairing code)');
        return;
      }
      
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect =
          lastDisconnect?.error instanceof Boom &&
          statusCode !== DisconnectReason.loggedOut &&
          statusCode !== 401;
        
        logger.warn('Connection closed', { statusCode, shouldReconnect });
        
        this.isConnected = false;
        this.eventEmitter.emit('status', { connected: false });
        
        if (shouldReconnect) {
          logger.info('🔄 Reconnecting in 5 seconds...');
          this.pairingCodeRequested = false;
          setTimeout(() => this.initialize(), 5000);
        } else {
          logger.error('❌ Connection failed permanently');
          console.log('\n⚠️  Delete auth_info_baileys folder and try again\n');
        }
      }
      else if (connection === 'open') {
        logger.info('✅ WhatsApp connected successfully!');
        this.isConnected = true;
        
        console.log('\n' + '='.repeat(70));
        console.log('🎉  WHATSAPP CONNECTED SUCCESSFULLY!');
        console.log('='.repeat(70));
        console.log('📱 User:', this.sock.user?.name || 'Unknown');
        console.log('📞 Phone:', this.sock.user?.id?.split(':')[0] || 'Unknown');
        console.log('='.repeat(70) + '\n');
        
        this.eventEmitter.emit('status', {
          connected: true,
          user: this.sock.user
        });
      }
      else if (connection === 'connecting') {
        console.log('🔄 Connecting to WhatsApp...');
      }
    });
    
    this.sock.ev.on('creds.update', saveCreds);
    
    this.sock.ev.on('messages.upsert', async ({ messages }) => {
      logger.debug('Message received', {
        from: messages[0]?.key?.remoteJid,
        text: messages[0]?.message?.conversation
      });
    });
  }
  
  /**
   * Request a CUSTOM pairing code (8-digit alphanumeric)
   * @param {string} phoneNumber - Phone number with country code (e.g., 919668154832)
   * @param {string} customCode - Your custom 8-digit code (e.g., "44444444")
   */
  async requestCustomPairingCode(phoneNumber, customCode = '44444444') {
    try {
      if (!phoneNumber) {
        throw new Error('Phone number is required');
      }
      
      if (!this.sock) {
        throw new Error('Socket not initialized');
      }
      
      if (this.pairingCodeRequested) {
        logger.warn('Pairing code already requested');
        return;
      }
      
      // Clean phone number (remove +, spaces, dashes)
      const cleanNumber = phoneNumber.replace(/[^\d]/g, '');
      
      // Validate custom code (must be 8 characters alphanumeric)
      if (!/^[A-Z0-9]{8}$/i.test(customCode)) {
        throw new Error('Custom code must be 8 alphanumeric characters');
      }
      
      logger.info(`📱 Requesting CUSTOM pairing code for: ${cleanNumber}`);
      logger.info(`🔑 Custom code: ${customCode}`);
      
      // Request pairing code with custom code
      const code = await this.sock.requestPairingCode(cleanNumber, customCode);
      
      this.pairingCodeRequested = true;
      
      // Format code as XXXX-XXXX
      const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;
      
      logger.info(`✅ Pairing code generated: ${formattedCode}`);
      
      console.log('\n' + '='.repeat(70));
      console.log('📱 YOUR CUSTOM PAIRING CODE: ' + formattedCode);
      console.log('='.repeat(70));
      console.log('⚡ INSTRUCTIONS:');
      console.log('');
      console.log('1. Open WhatsApp on phone: ' + cleanNumber);
      console.log('2. Go to: Settings → Linked Devices');
      console.log('3. Tap: "Link a Device"');
      console.log('4. Tap: "Link with phone number instead"');
      console.log('5. Enter this code: ' + formattedCode);
      console.log('');
      console.log('⏰ Code expires in 60 seconds!');
      console.log('='.repeat(70) + '\n');
      
      this.eventEmitter.emit('pairing_code', {
        code: formattedCode,
        phoneNumber: cleanNumber,
        customCode
      });
      
      return formattedCode;
    } catch (error) {
      logger.error('❌ Failed to request custom pairing code:', error);
      throw error;
    }
  }
  
  /**
   * Public method to request pairing code (for API/WebSocket calls)
   */
  async requestPairingCode(phoneNumber, customCode = '44444444') {
    return this.requestCustomPairingCode(phoneNumber, customCode);
  }
  
  getSocket() {
    return this.sock;
  }
  
  isReady() {
    return this.isConnected;
  }
}

module.exports = WhatsAppService;