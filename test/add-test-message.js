// test/add-test-message.js
// Script to add a test message to Firebase

const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase
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

const db = admin.database();

async function addTestMessage() {
  try {
    // Add a test user with balance
    await db.ref('users/test_user_001').set({
      name: 'Test User',
      phone: '1234567890',
      balance: 100.00,
      createdAt: Date.now()
    });
    console.log('✓ Test user created');

    // Add a test text message
    const textMessage = await db.ref('WAinventory').push({
      userId: 'test_user_001',
      recipientNumber: '1234567890', // Replace with actual number
      messageType: 'text',
      content: {
        text: 'Hello! This is an automated test message from WhatsApp Send Service.'
      },
      status: 'pending',
      createdAt: Date.now()
    });
    console.log('✓ Text message added:', textMessage.key);

    // Add a test image message
    const imageMessage = await db.ref('WAinventory').push({
      userId: 'test_user_001',
      recipientNumber: '1234567890', // Replace with actual number
      messageType: 'image',
      content: {
        imageUrl: 'https://picsum.photos/800/600',
        caption: 'Test image from automated sender'
      },
      status: 'pending',
      createdAt: Date.now()
    });
    console.log('✓ Image message added:', imageMessage.key);

    console.log('\n✓ Test messages added successfully!');
    console.log('The service will automatically process these messages when WhatsApp is connected.');
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error);
    process.exit(1);
  }
}

// Run the script
addTestMessage();