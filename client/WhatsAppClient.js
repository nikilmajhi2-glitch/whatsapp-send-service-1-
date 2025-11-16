const WebSocket = require('ws');

class WhatsAppClient {
  constructor(serverUrl = 'ws://localhost:8080') {
    this.ws = new WebSocket(serverUrl);
    this.isConnected = false;
    this.messageHandlers = new Map();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.ws.on('open', () => {
      console.log('✓ Connected to WhatsApp service');
      this.emit('connected');
    });

    this.ws.on('message', (data) => {
      const message = JSON.parse(data);
      this.handleServerMessage(message);
    });

    this.ws.on('error', (error) => {
      console.error('✗ WebSocket error:', error.message);
      this.emit('error', error);
    });

    this.ws.on('close', () => {
      console.log('✗ Disconnected from WhatsApp service');
      this.isConnected = false;
      this.emit('disconnected');
    });
  }

  handleServerMessage(message) {
    switch (message.type) {
      case 'status':
        this.isConnected = message.connected;
        this.emit('status', message);
        break;
      case 'qr':
        this.emit('qr', message.qr);
        break;
      case 'pairing_code':
        this.emit('pairing_code', message);
        break;
      case 'success':
        this.emit('success', message);
        break;
      case 'error':
        this.emit('error', message);
        break;
    }
  }

  on(event, handler) {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, []);
    }
    this.messageHandlers.get(event).push(handler);
  }

  emit(event, data) {
    const handlers = this.messageHandlers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }

  sendAction(action, payload) {
    this.ws.send(JSON.stringify({ action, payload }));
  }

  requestPairingCode(phoneNumber) {
    this.sendAction('request_pairing_code', { phoneNumber });
  }

  getConnectionStatus() {
    this.sendAction('get_connection_status', {});
  }

  sendTextMessage(number, message) {
    this.sendAction('send_text', { number, message });
  }

  sendImageMessage(number, imageUrl, caption = '') {
    this.sendAction('send_image', { number, imageUrl, caption });
  }

  sendDocumentMessage(number, documentUrl, fileName, mimetype = 'application/pdf') {
    this.sendAction('send_document', { number, documentUrl, fileName, mimetype });
  }

  checkNumber(number) {
    this.sendAction('check_number', { number });
  }

  close() {
    this.ws.close();
  }
}

module.exports = WhatsAppClient;
