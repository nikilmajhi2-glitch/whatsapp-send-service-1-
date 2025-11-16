const WhatsAppClient = require('../WhatsAppClient');

const client = new WhatsAppClient();

client.on('connected', () => {
  console.log('Ready to send messages!');
});

client.on('status', (data) => {
  if (data.connected) {
    console.log('WhatsApp is connected!');

    // Send a text message
    client.sendTextMessage('1234567890', 'Hello from WhatsApp Send Service!');
  }
});

client.on('success', (data) => {
  console.log('✓ Message sent successfully!');
  console.log('  Action:', data.action);
  console.log('  Message ID:', data.messageId);

  // Close connection after sending
  setTimeout(() => {
    client.close();
    process.exit(0);
  }, 1000);
});

client.on('error', (data) => {
  console.error('✗ Error:', data.message);
  process.exit(1);
});
