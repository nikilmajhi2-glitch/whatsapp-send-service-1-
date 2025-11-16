const WhatsAppClient = require('../WhatsAppClient');

const client = new WhatsAppClient();

client.on('status', (data) => {
  if (data.connected) {
    // Send a document
    client.sendDocumentMessage(
      '1234567890',
      'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      'sample-document.pdf',
      'application/pdf'
    );
  }
});

client.on('success', (data) => {
  console.log('✓ Document sent!', data.messageId);
  setTimeout(() => process.exit(0), 1000);
});

client.on('error', (data) => {
  console.error('✗ Error:', data.message);
  process.exit(1);
});
