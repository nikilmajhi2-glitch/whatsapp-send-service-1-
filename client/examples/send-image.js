const WhatsAppClient = require('../WhatsAppClient');

const client = new WhatsAppClient();

client.on('status', (data) => {
  if (data.connected) {
    // Send an image
    client.sendImageMessage(
      '1234567890',
      'https://picsum.photos/800/600',
      'Random image from Lorem Picsum'
    );
  }
});

client.on('success', (data) => {
  console.log('✓ Image sent!', data.messageId);
  setTimeout(() => process.exit(0), 1000);
});

client.on('error', (data) => {
  console.error('✗ Error:', data.message);
  process.exit(1);
});
