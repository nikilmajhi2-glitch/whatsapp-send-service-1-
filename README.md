# WhatsApp Send Service

A professional WhatsApp messaging service built with Baileys and WebSocket.

## Features
- ✅ Send text messages
- ✅ Send images with captions
- ✅ Send documents
- ✅ QR code authentication
- ✅ Pairing code authentication
- ✅ WebSocket real-time communication
- ✅ Auto-reconnection
- ✅ Persistent sessions

## Installation

```bash
npm install
```

## Quick Start

### With QR Code
```bash
npm start
```

### With Pairing Code
```bash
npm run start:pairing
# Or with phone number
node server.js --pairing-code --phone 1234567890
```

## API Documentation

See client examples in `client/examples/`

## License
MIT
