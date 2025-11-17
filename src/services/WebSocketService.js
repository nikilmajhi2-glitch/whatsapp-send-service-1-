const WebSocket = require('ws');
const logger = require('../utils/logger');
const config = require('../config/config');

class WebSocketService {
  constructor(messageHandler) {
    this.wss = null;
    this.clients = new Set();
    this.messageHandler = messageHandler;
  }

  initialize() {
    this.wss = new WebSocket.Server({ port: config.websocket.port });
    logger.info(`WebSocket server running on port ${config.websocket.port}`);

    this.wss.on('connection', (ws) => {
      logger.info('New WebSocket client connected');
      this.clients.add(ws);

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          await this.messageHandler(ws, data);
        } catch (error) {
          logger.error('Error handling client message:', error);
          this.sendError(ws, error.message);
        }
      });

      ws.on('close', () => {
        logger.info('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
      });
    });
  }

  broadcast(message) {
    const data = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  sendToClient(client, message) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  sendError(client, message, action = null) {
    this.sendToClient(client, {
      type: 'error',
      message,
      action
    });
  }

  sendSuccess(client, action, data = {}) {
    this.sendToClient(client, {
      type: 'success',
      action,
      ...data
    });
  }
}

module.exports = WebSocketService;
