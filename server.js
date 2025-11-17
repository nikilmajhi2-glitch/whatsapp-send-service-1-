const Application = require('./src/app');
const config = require('./src/config/config');
const logger = require('./src/utils/logger');
const readline = require('readline');
const express = require('express');

// Parse command line arguments
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--pairing-code' || args[i] === '-p') {
    config.whatsapp.usePairingCode = true;
  } else if (args[i] === '--phone' || args[i] === '-n') {
    config.whatsapp.phoneNumber = args[i + 1];
    i++;
  } else if (args[i] === '--custom-code' || args[i] === '-c') {
    config.whatsapp.customPairingCode = args[i + 1];
    i++;
  } else if (args[i] === '--port') {
    config.websocket.port = parseInt(args[i + 1]);
    i++;
  }
}

// Add Express for health check
const app = express();
const healthPort = 3000;

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'whatsapp-send-service'
  });
});

app.listen(healthPort, () => {
  logger.info(`Health check endpoint running on port ${healthPort}`);
});

async function startServer() {
  try {
    // Interactive mode for pairing code
    if (config.whatsapp.usePairingCode) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      // Ask for phone number if not provided
      if (!config.whatsapp.phoneNumber) {
        config.whatsapp.phoneNumber = await new Promise((resolve) => {
          rl.question('Enter phone number (with country code, e.g., 919668154832): ', (answer) => {
            resolve(answer.replace(/[^\d]/g, ''));
          });
        });
      }
      
      // Ask for custom pairing code if not provided
      if (!config.whatsapp.customPairingCode) {
        config.whatsapp.customPairingCode = await new Promise((resolve) => {
          rl.question('Enter custom 8-digit pairing code (or press Enter for default 44444444): ', (answer) => {
            rl.close();
            const code = answer.trim() || '44444444';
            
            // Validate code
            if (!/^[A-Z0-9]{8}$/i.test(code)) {
              logger.warn('Invalid code format. Using default: 44444444');
              resolve('44444444');
            } else {
              resolve(code.toUpperCase());
            }
          });
        });
      } else {
        rl.close();
      }
      
      // Display configuration
      console.log('\n' + '='.repeat(70));
      console.log('🔧 PAIRING CODE CONFIGURATION');
      console.log('='.repeat(70));
      console.log('📱 Phone Number:', config.whatsapp.phoneNumber);
      console.log('🔑 Custom Code:', config.whatsapp.customPairingCode);
      console.log('='.repeat(70) + '\n');
    }
    
    // Initialize application
    const whatsappApp = new Application();
    await whatsappApp.initialize();
    
    logger.info('Server started successfully');
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

// Display startup banner
console.log('\n' + '='.repeat(70));
console.log('🚀 WhatsApp Service Starting...');
console.log('='.repeat(70));
console.log('📦 Using nstar-y/bail (Custom Pairing Code Support)');
console.log('='.repeat(70) + '\n');

// Start the server
startServer();