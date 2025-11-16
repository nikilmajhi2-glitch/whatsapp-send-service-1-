const EventEmitter = require('events');
const WhatsAppService = require('./services/WhatsAppService');
const WebSocketService = require('./services/WebSocketService');
const MessageHandler = require('./handlers/MessageHandler');
const AuthHandler = require('./handlers/AuthHandler');
const logger = require('./utils/logger');

class Application {
  constructor() {
    this.eventEmitter = new EventEmitter();
    this.whatsappService = new WhatsAppService(this.eventEmitter);
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

      // Initialize WhatsApp connection
      await this.whatsappService.initialize();

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
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      this.websocketService.sendError(ws, error.message, action);
    }
  }
}

module.exports = Application;
