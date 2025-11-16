// src/services/FirebaseService.js

const admin = require('firebase-admin');
const logger = require('../utils/logger');

class FirebaseService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  initialize() {
    try {
      // Initialize Firebase Admin with your credentials
      const serviceAccount = {
        type: "service_account",
        project_id: "rupeedesk7",
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CERT_URL
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://rupeedesk7-default-rtdb.firebaseio.com"
      });

      this.db = admin.database();
      this.isInitialized = true;
      logger.info('Firebase service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Firebase:', error);
      throw error;
    }
  }

  /**
   * Get pending messages from WAinventory database
   */
  async getPendingMessages() {
    try {
      const snapshot = await this.db
        .ref('WAinventory')
        .orderByChild('status')
        .equalTo('pending')
        .once('value');

      const messages = [];
      snapshot.forEach((childSnapshot) => {
        messages.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });

      return messages;
    } catch (error) {
      logger.error('Error fetching pending messages:', error);
      throw error;
    }
  }

  /**
   * Update message status
   */
  async updateMessageStatus(messageId, status, messageInfo = {}) {
    try {
      await this.db.ref(`WAinventory/${messageId}`).update({
        status,
        ...messageInfo,
        updatedAt: admin.database.ServerValue.TIMESTAMP
      });
      logger.info(`Message ${messageId} status updated to ${status}`);
    } catch (error) {
      logger.error('Error updating message status:', error);
      throw error;
    }
  }

  /**
   * Get user balance
   */
  async getUserBalance(userId) {
    try {
      const snapshot = await this.db.ref(`users/${userId}/balance`).once('value');
      return snapshot.val() || 0;
    } catch (error) {
      logger.error('Error fetching user balance:', error);
      throw error;
    }
  }

  /**
   * Credit balance for sent message (0.91 per message)
   */
  async creditBalance(userId, amount = 0.91) {
    try {
      const currentBalance = await this.getUserBalance(userId);
      const newBalance = currentBalance + amount;
      
      await this.db.ref(`users/${userId}`).update({
        balance: newBalance,
        lastCredit: admin.database.ServerValue.TIMESTAMP
      });

      logger.info(`Balance credited for user ${userId}: ${amount}. New balance: ${newBalance}`);
      return newBalance;
    } catch (error) {
      logger.error('Error crediting balance:', error);
      throw error;
    }
  }

  /**
   * Listen for new messages in real-time
   */
  listenForNewMessages(callback) {
    const messagesRef = this.db.ref('WAinventory');
    
    messagesRef.on('child_added', (snapshot) => {
      const message = {
        id: snapshot.key,
        ...snapshot.val()
      };

      // Only process pending messages
      if (message.status === 'pending') {
        callback(message);
      }
    });

    logger.info('Started listening for new messages');
  }

  /**
   * Stop listening for messages
   */
  stopListening() {
    this.db.ref('WAinventory').off();
    logger.info('Stopped listening for messages');
  }

  /**
   * Log message transaction
   */
  async logTransaction(userId, messageId, type, amount, status) {
    try {
      await this.db.ref('transactions').push({
        userId,
        messageId,
        type,
        amount,
        status,
        timestamp: admin.database.ServerValue.TIMESTAMP
      });
    } catch (error) {
      logger.error('Error logging transaction:', error);
    }
  }
}

module.exports = FirebaseService;