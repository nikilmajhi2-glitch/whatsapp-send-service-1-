// debug-server.js - Use this to see full error details

const Application = require('./src/app');
const config = require('./src/config/config');
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
  console.log(`Health check endpoint running on port ${healthPort}`);
});

async function startServer() {
  try {
    // Interactive mode for pairing code
    if (config.whatsapp.usePairingCode && !config.whatsapp.phoneNumber) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      config.whatsapp.phoneNumber = await new Promise((resolve) => {
        rl.question('Enter phone number (with country code): ', (answer) => {
          rl.close();
          resolve(answer.replace(/[^\d]/g, ''));
        });
      });
    }

    console.log('\n=== Starting Application ===');
    console.log('Config:', JSON.stringify(config, null, 2));
    console.log('============================\n');

    // Initialize application
    const whatsappApp = new Application();
    await whatsappApp.initialize();

    console.log('✅ Server started successfully');
  } catch (error) {
    console.error('\n❌ DETAILED ERROR:');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('Error Details:', JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});

// Catch unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
});

// Start the server
startServer();
