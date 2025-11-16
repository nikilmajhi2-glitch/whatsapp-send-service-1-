const logger = require('../utils/logger');
const { cleanPhoneNumber, isValidPhoneNumber } = require('../utils/helpers');

class AuthHandler {
  constructor(whatsappService) {
    this.whatsappService = whatsappService;
  }

  async requestPairingCode(ws, wsService, { phoneNumber }) {
    try {
      if (this.whatsappService.isReady()) {
        throw new Error('Already connected to WhatsApp');
      }

      if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
        throw new Error('Invalid phone number');
      }

      const cleanNumber = cleanPhoneNumber(phoneNumber);
      const code = await this.whatsappService.requestPairingCode(cleanNumber);

      logger.info('Pairing code requested', { phoneNumber: cleanNumber });
      wsService.sendSuccess(ws, 'request_pairing_code', {
        code,
        phoneNumber: cleanNumber
      });
    } catch (error) {
      logger.error('Failed to request pairing code:', error);
      throw error;
    }
  }

  getStatus(ws, wsService) {
    const sock = this.whatsappService.getSocket();
    wsService.sendToClient(ws, {
      type: 'status',
      connected: this.whatsappService.isReady(),
      user: sock?.user || null
    });
  }
}

module.exports = AuthHandler;
