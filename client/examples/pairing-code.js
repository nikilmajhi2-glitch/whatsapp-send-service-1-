const WhatsAppClient = require('../WhatsAppClient');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const client = new WhatsAppClient();

client.on('connected', () => {
  rl.question('Enter your phone number (with country code): ', (phoneNumber) => {
    client.requestPairingCode(phoneNumber);
  });
});

client.on('pairing_code', (data) => {
  console.log('\n═══════════════════════════════════');
  console.log('📱 PAIRING CODE:', data.code);
  console.log('📞 Phone Number:', data.phoneNumber);
  console.log('═══════════════════════════════════');
  console.log('Enter this code in WhatsApp');
  console.log('\nWaiting for pairing...');
});

client.on('status', (data) => {
  if (data.connected && data.user) {
    console.log('\n✓ Successfully paired!');
    console.log('  Name:', data.user.name || 'N/A');
    console.log('  ID:', data.user.id);
    rl.close();
    setTimeout(() => process.exit(0), 2000);
  }
});

client.on('error', (data) => {
  console.error('✗ Error:', data.message);
  rl.close();
  process.exit(1);
});
