// src/services/MessageQueueService.js

const logger = require('../utils/logger');
const { formatJID } = require('../utils/helpers');

class MessageQueueService {
  constructor(whatsappService, firebaseService) {
    this.whatsappService = whatsappService;
    this.firebaseService = firebaseService;
    this.isProcessing = false;
    this.processingInterval = null;
  }

  /**
   * Start processing messages from Firebase
   */
  async startProcessing() {
    logger.info('Starting message queue processing...');

    // Listen for new messages in real-time
    this.firebaseService.listenForNewMessages(async (message) => {
      await this.processMessage(message);
    });

    // Also process existing pending messages
    await this.processExistingMessages();

    // Set up periodic check for pending messages (every 30 seconds)
    this.processingInterval = setInterval(async () => {
      await this.processExistingMessages();
    }, 30000);

    this.isProcessing = true;
    logger.info('Message queue processing started');
  }

  /**
   * Stop processing messages
   */
  stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    this.firebaseService.stopListening();
    this.isProcessing = false;
    logger.info('Message queue processing stopped');
  }

  /**
   * Process existing pending messages
   */
  async processExistingMessages() {
    try {
      const pendingMessages = await this.firebaseService.getPendingMessages();
      logger.info(`Found ${pendingMessages.length} pending messages`);

      for (const message of pendingMessages) {
        await this.processMessage(message);
        // Add small delay between messages to avoid rate limiting
        await this.delay(1000);
      }
    } catch (error) {
      logger.error('Error processing existing messages:', error);
    }
  }

  /**
   * Process a single message
   */
  async processMessage(message) {
    const { id, userId, recipientNumber, messageType, content } = message;

    try {
      // Check if WhatsApp is connected
      if (!this.whatsappService.isReady()) {
        logger.warn(`WhatsApp not connected, skipping message ${id}`);
        return;
      }

      // Mark as processing
      await this.firebaseService.updateMessageStatus(id, 'processing');

      // Send message based on type
      let result;
      const sock = this.whatsappService.getSocket();
      const jid = formatJID(recipientNumber);

      switch (messageType) {
        case 'text':
          result = await sock.sendMessage(jid, { text: content.text });
          break;

        case 'image':
          result = await sock.sendMessage(jid, {
            image: { url: content.imageUrl },
            caption: content.caption || ''
          });
          break;

        case 'document':
          result = await sock.sendMessage(jid, {
            document: { url: content.documentUrl },
            fileName: content.fileName,
            mimetype: content.mimetype || 'application/pdf'
          });
          break;

        default:
          throw new Error(`Unsupported message type: ${messageType}`);
      }

      // Credit balance after successful send (add 0.91)
      const newBalance = await this.firebaseService.creditBalance(userId, 0.91);

      // Update message status to sent
      await this.firebaseService.updateMessageStatus(id, 'sent', {
        messageId: result.key.id,
        timestamp: result.messageTimestamp,
        balanceAfter: newBalance
      });

      // Log transaction
      await this.firebaseService.logTransaction(
        userId,
        id,
        'message_sent_credit',
        0.91,
        'success'
      );

      logger.info(`Message ${id} sent successfully to ${recipientNumber}`);

    } catch (error) {
      logger.error(`Failed to process message ${id}:`, error);

      // Update message status to failed
      await this.firebaseService.updateMessageStatus(id, 'failed', {
        error: error.message
      });

      // Log failed transaction
      await this.firebaseService.logTransaction(
        userId,
        id,
        'message_failed',
        0,
        'failed'
      );
    }
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = MessageQueueService;