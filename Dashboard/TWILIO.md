# 📱 Twilio SMS & Calling Integration

Complete SMS and voice calling integration for the LOGIXX Dashboard using Twilio API.

## Features

### SMS Capabilities
- **Single SMS**: Send individual text messages to clients
- **Bulk SMS**: Send campaigns to multiple recipients at once
- **SMS History**: Track all sent messages with success/failure status
- **Auto-formatting**: Automatically formats phone numbers to E.164 format

### Voice Calling
- **Single Calls**: Make individual voice calls with text-to-speech
- **Bulk Calling**: Call multiple recipients with the same message
- **Call History**: Track all calls with status information
- **TwiML Support**: Uses Twilio's TwiML for voice message delivery

### Integration Features
- **LOGIXX Client Integration**: Send SMS directly to clients from your file database
- **Real-time Statistics**: Track daily and total SMS/calls
- **Activity Logging**: All communications logged in dashboard activity feed
- **Error Handling**: Comprehensive error tracking and reporting

## Setup Instructions

### 1. Get Twilio Credentials

1. Sign up for a [Twilio Account](https://www.twilio.com/try-twilio)
2. Get your free trial credits ($15 USD)
3. From the [Twilio Console](https://console.twilio.com/):
   - Copy your **Account SID**
   - Copy your **Auth Token**
   - Get a **Twilio Phone Number**

### 2. Configure Dashboard

1. Navigate to **Settings** (`/settings`)
2. Scroll to **Twilio SMS & Calling** section
3. Enter your credentials:
   - **Account SID**: Your Twilio Account SID (starts with `AC...`)
   - **Auth Token**: Your authentication token (keep secret!)
   - **Phone Number**: Your Twilio number in E.164 format (e.g., `+15551234567`)
4. Click **Save Settings**

### 3. Verify Configuration

1. Go to **Twilio SMS & Calls** page (`/twilio`)
2. Click **Test Credentials** (optional endpoint)
3. Send a test SMS to your own phone

## Usage Guide

### Sending SMS

#### Single SMS
1. Navigate to `/twilio`
2. Click **Send SMS** tab
3. Enter:
   - **Phone Number**: Recipient's number (with or without country code)
   - **Message**: Your text message (max 1600 characters)
4. Click **Send SMS**

#### Bulk SMS
1. Navigate to `/twilio`
2. Click **Send SMS** tab → **Send Bulk SMS** section
3. Enter:
   - **Phone Numbers**: One per line or comma-separated
   - **Message**: Same message for all recipients
4. Click **Send Bulk SMS**

Example phone number formats:
```
+1234567890
1234567890
555-123-4567
(555) 123-4567
```

### Making Calls

#### Single Call
1. Navigate to `/twilio`
2. Click **Make Calls** tab
3. Enter:
   - **Phone Number**: Recipient's number
   - **Voice Message**: Text that will be spoken
4. Click **Make Call**

#### Bulk Calls
1. Navigate to `/twilio`
2. Click **Make Calls** tab → **Make Bulk Calls** section
3. Enter:
   - **Phone Numbers**: One per line or comma-separated
   - **Voice Message**: Text to be spoken to all recipients
4. Confirm the cost warning
5. Click **Make Bulk Calls**

### Viewing History

1. Navigate to `/twilio`
2. Click **History** tab
3. View:
   - **SMS History**: All sent messages with timestamps
   - **Call History**: All made calls with status

## API Endpoints

### Send SMS
```bash
POST /api/twilio/sms/send
Content-Type: application/json

{
  "to": "+1234567890",
  "message": "Your message here"
}
```

### Send Bulk SMS
```bash
POST /api/twilio/sms/bulk
Content-Type: application/json

{
  "recipients": "+1234567890\n+0987654321",
  "message": "Your message here"
}
```

### Make Call
```bash
POST /api/twilio/call/make
Content-Type: application/json

{
  "to": "+1234567890",
  "message": "This will be spoken during the call"
}
```

### Make Bulk Calls
```bash
POST /api/twilio/call/bulk
Content-Type: application/json

{
  "recipients": "+1234567890\n+0987654321",
  "message": "This will be spoken to all recipients"
}
```

### Get SMS History
```bash
GET /api/twilio/sms/history?limit=50
```

### Get Call History
```bash
GET /api/twilio/call/history?limit=50
```

### Test Credentials
```bash
POST /api/twilio/test
```

## Phone Number Formatting

The system automatically formats phone numbers to E.164 format:

- Input: `5551234567` → Output: `+15551234567` (assumes US/Canada)
- Input: `15551234567` → Output: `+15551234567`
- Input: `+1234567890` → Output: `+1234567890` (kept as is)

## Cost Considerations

### Twilio Pricing (as of 2024)
- **SMS**: ~$0.0075 per message (US/Canada)
- **Voice Calls**: ~$0.013 per minute (US/Canada)
- **Toll-Free SMS**: ~$0.0125 per message

### Trial Account
- Free $15 credit
- Can send ~2,000 SMS or ~1,150 minutes of calls
- Trial accounts can only message verified phone numbers

### Recommendations
1. Test with trial account first
2. Monitor costs in Twilio Console
3. Set up billing alerts
4. Use bulk operations wisely
5. Consider message length (SMS is charged per segment)

## Compliance & Best Practices

### Legal Compliance
- **TCPA Compliance**: Obtain consent before messaging
- **CAN-SPAM**: Include opt-out option in messages
- **Do Not Call Registry**: Check before calling
- **Business Hours**: Respect calling time restrictions (8 AM - 9 PM local time)

### Message Best Practices
1. Always identify your business
2. Include opt-out instructions: "Reply STOP to unsubscribe"
3. Keep messages concise and relevant
4. Avoid spam trigger words
5. Respect frequency limits

### Voice Call Best Practices
1. Keep messages under 30 seconds
2. Speak clearly and slowly
3. Provide callback information
4. Respect Do Not Call lists
5. Call during business hours only

## Troubleshooting

### SMS Not Sending

**Error: "Twilio is not configured"**
- Solution: Add credentials in Settings page

**Error: "Invalid phone number"**
- Solution: Use E.164 format (+1234567890)
- Check country code is correct

**Error: "Authentication failed"**
- Solution: Verify Account SID and Auth Token
- Ensure no extra spaces in credentials

### Calls Failing

**Error: "From number not verified"**
- Solution: Use your Twilio phone number from console
- Verify number is enabled for voice

**Error: "To number not verified" (Trial Account)**
- Solution: Verify recipient number in Twilio Console
- Upgrade to paid account for unrestricted calling

### Rate Limiting

Twilio has rate limits:
- Default: 1 message per second
- Calls: Handled with 1-second delay between calls in bulk operations

The dashboard implements delays to avoid rate limiting.

## Advanced Features

### Custom TwiML for Calls

You can create custom voice experiences by providing TwiML URLs:

```javascript
// In your own code
await twilioService.makeCall(
  '+1234567890',
  null, // no message text
  'https://yourdomain.com/twiml/custom-greeting'
);
```

### Webhook Integration

Set up webhooks in Twilio Console to receive:
- Message delivery status
- Call completion status
- Incoming messages/calls

### Message Scheduling (Custom Implementation)

Combine with node-cron for scheduled messages:

```javascript
const cron = require('node-cron');

// Send daily reminder at 9 AM
cron.schedule('0 9 * * *', async () => {
  await twilioService.sendSMS('+1234567890', 'Daily reminder message');
});
```

## Database Storage

### SMS History
Stored in: `data/sms-history.json`

Format:
```json
{
  "to": "+1234567890",
  "message": "Your message",
  "success": true,
  "messageId": "SM...",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Call History
Stored in: `data/call-history.json`

Format:
```json
{
  "to": "+1234567890",
  "message": "Voice message",
  "success": true,
  "callId": "CA...",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Security Notes

1. **Credentials Storage**: Currently stored in JSON files
   - **Production**: Move to environment variables
   - Use `.env` file with `dotenv` package
   - Never commit credentials to Git

2. **Auth Token**: Keep secret
   - Rotate regularly
   - Use Twilio API Keys for production

3. **Rate Limiting**: Implement on production
   - Prevent abuse
   - Monitor usage patterns

## Support & Resources

- [Twilio Documentation](https://www.twilio.com/docs)
- [Twilio Console](https://console.twilio.com/)
- [Node.js Helper Library](https://www.twilio.com/docs/libraries/node)
- [Twilio Status](https://status.twilio.com/)

## License

This integration uses the official Twilio Node.js SDK licensed under MIT.
