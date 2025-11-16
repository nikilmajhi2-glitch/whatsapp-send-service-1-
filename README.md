# WhatsApp Send Service with Firebase Integration

Automatic WhatsApp message sender with Firebase database integration, real-time message queue, and balance management.

## Features

- ✅ **Automatic Message Sending**: Automatically sends messages when user binds WhatsApp
- ✅ **Firebase Integration**: Fetches messages from Firebase Realtime Database
- ✅ **Balance Management**: Credits 0.91 per message to user balance
- ✅ **Real-time Queue**: Listens for new messages and processes them automatically
- ✅ **Multi-format Support**: Text, images, and documents
- ✅ **Transaction Logging**: Complete audit trail of all messages
- ✅ **WebSocket API**: Real-time communication with clients
- ✅ **Two Auth Methods**: QR code or pairing code

## Installation

```bash
# Clone the repository
git clone <your-repo>
cd whatsapp-send-service

# Install dependencies
npm install

# Install Firebase Admin SDK
npm install firebase-admin
```

## Configuration

### 1. Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: **rupeedesk7**
3. Go to Project Settings → Service Accounts
4. Click "Generate New Private Key"
5. Save the JSON file

### 2. Setup Environment Variables

Create `.env` file:

```bash
# Server
PORT=8080
NODE_ENV=development
WS_PORT=8080

# WhatsApp
USE_PAIRING_CODE=true
PHONE_NUMBER=

# Firebase (from service account JSON)
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@rupeedesk7.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/...
```

### 3. Setup Firebase Database Structure

#### WAinventory (Messages)
```
WAinventory/
  └── messageId/
      ├── userId: "user123"
      ├── recipientNumber: "1234567890"
      ├── messageType: "text|image|document"
      ├── content: { ... }
      ├── status: "pending|processing|sent|failed"
      └── createdAt: timestamp
```

#### Users (Balance)
```
users/
  └── userId/
      ├── name: "User Name"
      ├── phone: "1234567890"
      └── balance: 100.00
```

## Usage

### Start Server

```bash
# Start with QR code
npm start

# Start with pairing code
npm run pairing
# Then enter your phone number when prompted
```

### Automatic Message Processing

Once WhatsApp is connected, the service will:

1. ✅ Listen for new messages in `WAinventory`
2. ✅ Send message via WhatsApp
3. ✅ Credit 0.91 to user balance (user earns for sending)
4. ✅ Update message status to "sent"
5. ✅ Log transaction

### Add Messages to Firebase

**Method 1: Using Firebase Console**
1. Go to Firebase Console
2. Navigate to Realtime Database
3. Add message to `WAinventory` collection

**Method 2: Using Test Script**
```bash
node test/add-test-message.js
```

**Method 3: Using Firebase SDK**
```javascript
const message = {
  userId: "user123",
  recipientNumber: "1234567890",
  messageType: "text",
  content: {
    text: "Hello from automated sender!"
  },
  status: "pending",
  createdAt: Date.now()
};

await db.ref('WAinventory').push(message);
```

## Message Types

### Text Message
```json
{
  "messageType": "text",
  "content": {
    "text": "Your message here"
  }
}
```

### Image Message
```json
{
  "messageType": "image",
  "content": {
    "imageUrl": "https://example.com/image.jpg",
    "caption": "Optional caption"
  }
}
```

### Document Message
```json
{
  "messageType": "document",
  "content": {
    "documentUrl": "https://example.com/file.pdf",
    "fileName": "document.pdf",
    "mimetype": "application/pdf"
  }
}
```

## WebSocket API

### Connect
```javascript
const ws = new WebSocket('ws://localhost:8080');
```

### Get User Balance
```javascript
ws.send(JSON.stringify({
  action: 'get_user_balance',
  payload: { userId: 'user123' }
}));
```

### Manual Control
```javascript
// Start automatic processing
ws.send(JSON.stringify({
  action: 'start_auto_send'
}));

// Stop automatic processing
ws.send(JSON.stringify({
  action: 'stop_auto_send'
}));
```

## Message Status Flow

```
pending → processing → sent
                    ↘ failed
```

- **pending**: Message is waiting to be sent
- **processing**: Message is being sent
- **sent**: Successfully delivered to WhatsApp
- **failed**: Failed (insufficient balance or error)

## Balance Management

- **Credit per message**: +0.91 credits
- **Auto-credit**: After successful send
- **No balance check**: Users can send without minimum balance
- **Transaction log**: Complete audit trail

**Example:**
- User starts: 0.00
- Sends 1 message → Balance: 0.91
- Sends 10 messages → Balance: 9.10
- Sends 100 messages → Balance: 91.00

## Monitoring

### View Logs
```bash
tail -f logs/app.log
```

### Health Check
```bash
curl http://localhost:3000/health
```

## Error Handling

The system handles:
- ✅ WhatsApp disconnection
- ✅ Invalid phone numbers
- ✅ Network errors
- ✅ Rate limiting

All errors are:
- Logged to file
- Updated in Firebase
- Sent via WebSocket

## Testing

### 1. Add Test User and Messages
```bash
node test/add-test-message.js
```

### 2. Check Processing
Monitor logs to see messages being processed automatically.

### 3. Verify Balance
Check Firebase to see balance deductions.

## Production Deployment

### 1. Set Environment Variables
```bash
export NODE_ENV=production
export USE_PAIRING_CODE=true
export PHONE_NUMBER=your_number
# ... other Firebase variables
```

### 2. Use Process Manager
```bash
npm install -g pm2
pm2 start server.js --name whatsapp-service
pm2 save
pm2 startup
```

### 3. Enable Firewall
```bash
# Allow WebSocket port
sudo ufw allow 8080/tcp
# Allow health check port
sudo ufw allow 3000/tcp
```

## Troubleshooting

### WhatsApp Not Connecting
- Check internet connection
- Verify auth credentials
- Delete `auth_info_baileys` folder and reconnect

### Messages Not Sending
- Verify WhatsApp is connected
- Verify phone number format
- Check Firebase permissions

### Balance Not Crediting
- Check Firebase write permissions
- Verify userId exists in database
- Check transaction logs

## Support

For issues or questions:
1. Check logs: `logs/app.log`
2. Verify Firebase connection
3. Check WhatsApp status
4. Review error messages

## License

MIT