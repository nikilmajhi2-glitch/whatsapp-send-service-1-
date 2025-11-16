// src/app.js

const EventEmitter = require('events');
const WhatsAppService = require('./services/WhatsAppService');
const WebSocketService = require('./services/WebSocketService');
const FirebaseService = require('./services/FirebaseService');
const MessageQueueService = require('./services/MessageQueueService');
const MessageHandler = require('./handlers/MessageHandler');
const AuthHandler = require('./handlers/AuthHandler');
const logger = require('./utils/logger');

class Application {
  constructor() {
    this.eventEmitter = new EventEmitter();
    this.whatsappService = new WhatsAppService(this.eventEmitter);
    this.firebaseService = new FirebaseService();
    this.messageQueueService = null;
    this.messageHandler = new MessageHandler(this.whatsappService);
    this.authHandler = new AuthHandler(this.whatsappService);

    this.websocketService = new WebSocketService(
      this.handleClientMessage.bind(this)
    );
  }

  async initialize() {
    try {
      // Setup event listeners
      this.setupEventListeners();

      // Initialize WebSocket server
      this.websocketService.initialize();

      // Initialize Firebase
      this.firebaseService.initialize();

      // Initialize WhatsApp connection
      await this.whatsappService.initialize();

      // Initialize Message Queue Service
      this.messageQueueService = new MessageQueueService(
        this.whatsappService,
        this.firebaseService
      );

      logger.info('Application initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize application:', error);
      throw error;
    }
  }

  setupEventListeners() {
    this.eventEmitter.on('qr', (qr) => {
      this.websocketService.broadcast({ type: 'qr', qr });
    });

    this.eventEmitter.on('pairing_code', ({ code, phoneNumber }) => {
      this.websocketService.broadcast({
        type: 'pairing_code',
        code,
        phoneNumber
      });
    });

    this.eventEmitter.on('status', (data) => {
      this.websocketService.broadcast({
        type: 'status',
        ...data
      });

      // Start processing messages when WhatsApp connects
      if (data.connected && this.messageQueueService) {
        logger.info('WhatsApp connected - Starting automatic message processing');
        this.messageQueueService.startProcessing();
      }
    });
  }

  async handleClientMessage(ws, data) {
    const { action, payload } = data;

    try {
      switch (action) {
        case 'send_text':
          await this.messageHandler.sendText(ws, this.websocketService, payload);
          break;
        case 'send_image':
          await this.messageHandler.sendImage(ws, this.websocketService, payload);
          break;
        case 'send_document':
          await this.messageHandler.sendDocument(ws, this.websocketService, payload);
          break;
        case 'check_number':
          await this.messageHandler.checkNumber(ws, this.websocketService, payload);
          break;
        case 'request_pairing_code':
          await this.authHandler.requestPairingCode(ws, this.websocketService, payload);
          break;
        case 'get_connection_status':
          this.authHandler.getStatus(ws, this.websocketService);
          break;
        case 'get_user_balance':
          await this.getUserBalance(ws, payload);
          break;
        case 'start_auto_send':
          await this.startAutoSend(ws);
          break;
        case 'stop_auto_send':
          await this.stopAutoSend(ws);
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      this.websocketService.sendError(ws, error.message, action);
    }
  }

  async getUserBalance(ws, { userId }) {
    try {
      const balance = await this.firebaseService.getUserBalance(userId);
      this.websocketService.sendSuccess(ws, 'get_user_balance', {
        userId,
        balance
      });
    } catch (error) {
      throw error;
    }
  }

  async startAutoSend(ws) {
    try {
      if (!this.whatsappService.isReady()) {
        throw new Error('WhatsApp not connected');
      }

      await this.messageQueueService.startProcessing();
      this.websocketService.sendSuccess(ws, 'start_auto_send', {
        message: 'Automatic message sending started'
      });
    } catch (error) {
      throw error;
    }
  }

  async stopAutoSend(ws) {
    try {
      this.messageQueueService.stopProcessing();
      this.websocketService.sendSuccess(ws, 'stop_auto_send', {
        message: 'Automatic message sending stopped'
      });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Application;