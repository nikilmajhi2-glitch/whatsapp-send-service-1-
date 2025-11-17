// check-dependencies.js - Verify all required modules are installed

console.log('🔍 Checking Dependencies...\n');

const requiredModules = [
  '@whiskeysockets/baileys',
  '@hapi/boom',
  'express',
  'ws',
  'pino',
  'pino-pretty',
  'dotenv',
  'firebase-admin'
];

let allGood = true;

for (const module of requiredModules) {
  try {
    require(module);
    console.log(`✅ ${module}`);
  } catch (error) {
    console.log(`❌ ${module} - NOT INSTALLED`);
    allGood = false;
  }
}

console.log('\n🔍 Checking Project Files...\n');

const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'src/app.js',
  'src/config/config.js',
  'src/services/WhatsAppService.js',
  'src/services/WebSocketService.js',
  'src/services/FirebaseService.js',
  'src/services/MessageQueueService.js',
  'src/handlers/MessageHandler.js',
  'src/handlers/AuthHandler.js',
  'src/utils/logger.js',
  'src/utils/helpers.js',
  '.env'
];

for (const file of requiredFiles) {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allGood = false;
  }
}

console.log('\n🔍 Checking .env Configuration...\n');

require('dotenv').config();

const requiredEnvVars = [
  'FIREBASE_PRIVATE_KEY_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_CLIENT_ID',
  'FIREBASE_CERT_URL'
];

for (const envVar of requiredEnvVars) {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar}`);
  } else {
    console.log(`❌ ${envVar} - NOT SET`);
    allGood = false;
  }
}

console.log('\n' + '='.repeat(50));
if (allGood) {
  console.log('✅ ALL CHECKS PASSED! Ready to start server.');
} else {
  console.log('❌ SOME CHECKS FAILED! Please fix the issues above.');
  process.exit(1);
}
console.log('='.repeat(50) + '\n');
