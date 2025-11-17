const logger = require('../utils/logger');
const { formatJID } = require('../utils/helpers');

class MessageHandler {
  constructor(whatsappService) {
    this.whatsappService = whatsappService;
  }

  async sendText(ws, wsService, { number, message }) {
    try {
      if (!this.whatsappService.isReady()) {
        throw new Error('WhatsApp not connected');
      }

      const jid = formatJID(number);
      const sock = this.whatsappService.getSocket();
      const result = await sock.sendMessage(jid, { text: message });

      logger.info('Text message sent', { to: number, messageId: result.key.id });
      wsService.sendSuccess(ws, 'send_text', {
        messageId: result.key.id,
        timestamp: result.messageTimestamp
      });
    } catch (error) {
      logger.error('Failed to send text message:', error);
      throw error;
    }
  }

  async sendImage(ws, wsService, { number, imageUrl, caption }) {
    try {
      if (!this.whatsappService.isReady()) {
        throw new Error('WhatsApp not connected');
      }

      const jid = formatJID(number);
      const sock = this.whatsappService.getSocket();
      const result = await sock.sendMessage(jid, {
        image: { url: imageUrl },
        caption: caption || ''
      });

      logger.info('Image sent', { to: number, messageId: result.key.id });
      wsService.sendSuccess(ws, 'send_image', {
        messageId: result.key.id
      });
    } catch (error) {
      logger.error('Failed to send image:', error);
      throw error;
    }
  }

  async sendDocument(ws, wsService, { number, documentUrl, fileName, mimetype }) {
    try {
      if (!this.whatsappService.isReady()) {
        throw new Error('WhatsApp not connected');
      }

      const jid = formatJID(number);
      const sock = this.whatsappService.getSocket();
      const result = await sock.sendMessage(jid, {
        document: { url: documentUrl },
        fileName: fileName,
        mimetype: mimetype || 'application/pdf'
      });

      logger.info('Document sent', { to: number, messageId: result.key.id });
      wsService.sendSuccess(ws, 'send_document', {
        messageId: result.key.id
      });
    } catch (error) {
      logger.error('Failed to send document:', error);
      throw error;
    }
  }

  async checkNumber(ws, wsService, { number }) {
    try {
      if (!this.whatsappService.isReady()) {
        throw new Error('WhatsApp not connected');
      }

      const jid = formatJID(number);
      const sock = this.whatsappService.getSocket();
      const [result] = await sock.onWhatsApp(jid);

      logger.info('Number checked', { number, exists: !!result });
      wsService.sendSuccess(ws, 'check_number', {
        exists: !!result,
        jid: result?.jid
      });
    } catch (error) {
      logger.error('Failed to check number:', error);
      throw error;
    }
  }
}

module.exports = MessageHandler;
