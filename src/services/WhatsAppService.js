const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion
} = require('@itsukichan/baileys');

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
      
      // Wait for connection then request pairing code
      if (config.whatsapp.usePairingCode && config.whatsapp.phoneNumber) {
        if (!state.creds.registered) {
          logger.info('⏳ Waiting for connection to request pairing code...');
          
          // Wait for the connection to be established
          await new Promise((resolve) => {
            const checkConnection = setInterval(() => {
              if (this.sock.ws && this.sock.ws.readyState === 1) {
                clearInterval(checkConnection);
                resolve();
              }
            }, 100);
            
            // Timeout after 10 seconds
            setTimeout(() => {
              clearInterval(checkConnection);
              resolve();
            }, 10000);
          });
          
          // Small delay to ensure handshake is complete
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          logger.info('✅ Connection established, requesting pairing code...');
          await this.requestPairingCode(config.whatsapp.phoneNumber);
        } else {
          logger.info('Already registered, skipping pairing code request');
        }
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
      
      // Suppress QR if using pairing code
      if (qr && config.whatsapp.usePairingCode) {
        logger.debug('QR code suppressed (using pairing code mode)');
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
          console.log('Run: rm -rf auth_info_baileys\n');
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
  
  async requestPairingCode(phoneNumber) {
    try {
      if (!phoneNumber) {
        throw new Error('Phone number is required');
      }
      
      if (!this.sock) {
        throw new Error('Socket not initialized');
      }
      
      if (this.pairingCodeRequested) {
        logger.warn('Pairing code already requested, skipping...');
        return;
      }
      
      // Clean phone number
      const cleanNumber = phoneNumber.replace(/[^\d]/g, '');
      
      logger.info(`📱 Requesting pairing code for: ${cleanNumber}`);
      
      // Request pairing code
      const code = await this.sock.requestPairingCode(cleanNumber);
      
      this.pairingCodeRequested = true;
      
      logger.info(`✅ Pairing code generated: ${code}`);
      
      console.log('\n' + '='.repeat(70));
      console.log('📱 YOUR PAIRING CODE: ' + code);
      console.log('='.repeat(70));
      console.log('⚡ INSTRUCTIONS:');
      console.log('');
      console.log('1. Open WhatsApp on your phone (number: ' + cleanNumber + ')');
      console.log('2. Tap Settings (⚙️) → Linked Devices');
      console.log('3. Tap "Link a Device"');
      console.log('4. Tap "Link with phone number instead"');
      console.log('5. Enter this code: ' + code);
      console.log('');
      console.log('⏰ Code expires in 60 seconds!');
      console.log('='.repeat(70) + '\n');
      
      this.eventEmitter.emit('pairing_code', {
        code,
        phoneNumber: cleanNumber
      });
      
      return code;
    } catch (error) {
      logger.error('❌ Failed to request pairing code:', error);
      throw error;
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