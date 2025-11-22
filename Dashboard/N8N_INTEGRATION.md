# 🤖 n8n + ElevenLabs + Twilio Integration

Complete automation workflow for sending AI-generated personalized voicemails to clients using n8n, ElevenLabs, and Twilio.

## Overview

This integration allows you to:
1. Fetch client data from your LOGIXX Dashboard
2. Generate personalized message text for each client
3. Convert text to natural-sounding speech using ElevenLabs AI
4. Make phone calls via Twilio and play the AI voicemail
5. Track all activity in your dashboard

## Architecture

```
LOGIXX Dashboard → n8n → ElevenLabs → Storage → Twilio → Client Phone
     (Data)      (Orchestration)  (AI Voice)  (Audio)   (Calls)
```

## Prerequisites

### 1. n8n Installation

**Option A: Docker (Recommended)**
```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

**Option B: npm**
```bash
npm install n8n -g
n8n start
```

Access n8n at: `http://localhost:5678`

### 2. ElevenLabs Account

1. Sign up at [ElevenLabs](https://elevenlabs.io/)
2. Get your API key from Settings
3. Choose or create a voice (note the Voice ID)
4. Free tier: 10,000 characters/month

### 3. Twilio Account (Already Set Up)

Your Twilio credentials are already configured in the LOGIXX Dashboard settings.

### 4. Public Storage for Audio Files

You need a place to host the generated audio files publicly. Options:

**Option A: AWS S3**
- Create S3 bucket with public read access
- Get AWS credentials

**Option B: Cloudinary**
- Free tier available
- Easy API integration

**Option C: Your Own Server**
- Set up a public directory on your server

## Setup Instructions

### Step 1: Install n8n

Choose one of the installation methods above and start n8n.

### Step 2: Import Workflow

1. Open n8n at `http://localhost:5678`
2. Click "Add Workflow" → "Import from File"
3. Upload `n8n-workflows/ai-voicemail-workflow.json`
4. The workflow will be imported with all nodes

### Step 3: Configure Credentials

#### ElevenLabs Credentials

1. In n8n, go to Credentials → Add Credential
2. Select "Header Auth"
3. Name: "ElevenLabs API"
4. Add header:
   - **Name**: `xi-api-key`
   - **Value**: Your ElevenLabs API key

#### Update Voice ID

1. In the workflow, click on "Generate Voice (ElevenLabs)" node
2. Replace `VOICE_ID` in the URL with your actual Voice ID
3. Find Voice IDs at: https://api.elevenlabs.io/v1/voices

### Step 4: Configure Storage

#### Using AWS S3

Add this node between "Generate Voice" and "Make Call":

```json
{
  "name": "Upload to S3",
  "type": "n8n-nodes-base.awsS3",
  "parameters": {
    "operation": "upload",
    "bucketName": "your-bucket-name",
    "fileName": "={{ $json.appId }}_voicemail.mp3",
    "binaryData": true,
    "options": {
      "acl": "public-read"
    }
  }
}
```

#### Using Cloudinary

```json
{
  "name": "Upload to Cloudinary",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/upload",
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        {
          "name": "file",
          "value": "={{ $binary.data }}"
        },
        {
          "name": "api_key",
          "value": "YOUR_API_KEY"
        },
        {
          "name": "timestamp",
          "value": "={{ Math.round(Date.now() / 1000) }}"
        },
        {
          "name": "signature",
          "value": "YOUR_SIGNATURE"
        }
      ]
    }
  }
}
```

### Step 5: Update Dashboard URL

If your LOGIXX Dashboard is not running on `localhost:3000`, update the URLs in these nodes:
- Get All Clients
- Make Call via Twilio
- Log to Dashboard

Replace `http://localhost:3000` with your actual dashboard URL.

### Step 6: Test the Workflow

1. Click "Execute Workflow" button
2. Check the execution log for any errors
3. Verify calls are logged in your LOGIXX Dashboard activity

## Workflow Nodes Explained

### 1. Start
Manual trigger to start the workflow.

### 2. Get All Clients
Fetches all client data from your LOGIXX Dashboard API.

**Endpoint**: `GET /api/n8n/clients`

### 3. Split Clients
Processes clients one at a time to avoid overwhelming the APIs.

### 4. Generate Message
JavaScript code that creates a personalized message for each client.

**Customize this node** with your own message template:

```javascript
const client = $input.item.json;

const message = `Hello ${client.name}.
This is a message from Better Debt Solutions.
We wanted to discuss your account regarding ${client.debtAmount} dollars in debt.
We have solutions that may help reduce your payments.
Please call us back at 1-800-XXX-XXXX.
Thank you.`;

return {
  json: {
    ...client,
    personalizedMessage: message
  }
};
```

### 5. Generate Voice (ElevenLabs)
Converts the personalized text to speech using ElevenLabs AI.

**API**: `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`

**Voice Settings**:
- `stability`: 0.5 (how stable/consistent the voice is)
- `similarity_boost`: 0.75 (how similar to the original voice)

### 6. Upload Audio to Public URL
Uploads the generated MP3 to a publicly accessible URL.

**Required**: The audio must be accessible via HTTP/HTTPS for Twilio to play it.

### 7. Make Call via Twilio
Calls the client using your LOGIXX Dashboard Twilio integration.

**Endpoint**: `POST /api/n8n/call/with-audio`

**Payload**:
```json
{
  "to": "+1234567890",
  "audioUrl": "https://your-storage.com/audio.mp3",
  "clientData": {
    "name": "John Doe",
    "appId": "#12345",
    "debtAmount": "5000"
  }
}
```

### 8. Wait 2 Seconds
Prevents rate limiting by adding a delay between calls.

**Twilio Rate Limits**:
- Default: 1 call per second
- Adjust this based on your account limits

### 9. Log to Dashboard
Logs the activity back to your LOGIXX Dashboard for tracking.

**Endpoint**: `POST /api/n8n/log`

## Available API Endpoints

### Get All Clients
```bash
GET http://localhost:3000/api/n8n/clients

Response:
{
  "success": true,
  "count": 150,
  "clients": [
    {
      "appId": "#12345",
      "alv": "ALV67890",
      "name": "John Doe",
      "phone": "555-123-4567",
      "email": "john@example.com",
      "status": "Active",
      "debtAmount": "5000",
      "notes": "Interested in settlement",
      "addedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Get Single Client
```bash
GET http://localhost:3000/api/n8n/clients/:appId

Response:
{
  "success": true,
  "client": {
    "appId": "#12345",
    "name": "John Doe",
    ...
  }
}
```

### Make Call with Audio URL
```bash
POST http://localhost:3000/api/n8n/call/with-audio
Content-Type: application/json

{
  "to": "+1234567890",
  "audioUrl": "https://storage.com/voicemail.mp3",
  "clientData": {
    "name": "John Doe",
    "appId": "#12345"
  }
}

Response:
{
  "success": true,
  "callId": "CAxxxx",
  "status": "queued",
  "to": "+1234567890",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Log Workflow Activity
```bash
POST http://localhost:3000/api/n8n/log
Content-Type: application/json

{
  "workflow": "AI Voicemail Campaign",
  "action": "Call Completed",
  "details": "Called John Doe at +1234567890",
  "type": "success"
}

Response:
{
  "success": true
}
```

### Webhook for Call Status
```bash
POST http://localhost:3000/api/n8n/webhook/call-status
Content-Type: application/json

{
  "callId": "CAxxxx",
  "status": "completed",
  "to": "+1234567890",
  "clientData": {...}
}
```

## Advanced Configurations

### Filtering Clients

Modify the "Get All Clients" node to filter by status:

```javascript
// Add this node after "Get All Clients"
{
  "name": "Filter Active Clients",
  "type": "n8n-nodes-base.filter",
  "parameters": {
    "conditions": {
      "string": [
        {
          "value1": "={{ $json.status }}",
          "operation": "equals",
          "value2": "Active"
        }
      ]
    }
  }
}
```

### Different Messages by Debt Amount

```javascript
const client = $input.item.json;
let message;

if (client.debtAmount > 10000) {
  message = `Hello ${client.name}. We have a special debt reduction program for amounts over $10,000...`;
} else if (client.debtAmount > 5000) {
  message = `Hello ${client.name}. We can help reduce your $${client.debtAmount} debt by up to 50%...`;
} else {
  message = `Hello ${client.name}. We have affordable payment plans for your $${client.debtAmount} debt...`;
}

return {
  json: {
    ...client,
    personalizedMessage: message
  }
};
```

### Schedule Workflow

1. Replace "Start" node with "Cron" node
2. Set schedule (e.g., "0 9 * * 1-5" = 9 AM Monday-Friday)
3. Workflow runs automatically

### Multiple Voice Options

Use different ElevenLabs voices based on client preferences:

```javascript
// Determine voice based on client data
const client = $input.item.json;

const maleVoiceId = "21m00Tcm4TlvDq8ikWAM";
const femaleVoiceId = "EXAVITQu4vr4xnSDxMaL";

// Use female voice for female names (simple example)
const femaleNames = ["Jane", "Sarah", "Emily", "Lisa"];
const voiceId = femaleNames.some(name => client.name.includes(name))
  ? femaleVoiceId
  : maleVoiceId;

return {
  json: {
    ...client,
    voiceId: voiceId
  }
};
```

## Compliance & Best Practices

### Legal Requirements

1. **TCPA Compliance**: Only call clients who have given prior consent
2. **Calling Hours**: Respect time zones and call 8 AM - 9 PM local time
3. **Do Not Call Registry**: Check DNC lists before calling
4. **Opt-Out**: Provide clear opt-out instructions in voicemail

### Best Practices

1. **Message Length**: Keep voicemails under 30 seconds
2. **Clear CTA**: Always include a callback number
3. **Professional Tone**: Use appropriate ElevenLabs voice settings
4. **Rate Limiting**: Don't exceed 1 call per 2 seconds
5. **Error Handling**: Add error handling nodes for failed calls
6. **Testing**: Always test with your own number first

### Sample Compliant Message

```javascript
const message = `Hello ${client.name}, this is an important message from Better Debt Solutions. We're calling regarding your account. This is an attempt to collect a debt. We have information about potential payment options for your account. Please call us back at 1-800-XXX-XXXX. This call may be monitored or recorded. To opt out of future calls, press 9 or call our opt-out line at 1-800-XXX-XXXX. Thank you.`;
```

## Troubleshooting

### ElevenLabs API Errors

**Error: "Invalid API key"**
- Check your API key in n8n credentials
- Ensure header is named `xi-api-key`

**Error: "Voice not found"**
- Verify Voice ID in the URL
- Get list of voices: `GET https://api.elevenlabs.io/v1/voices`

**Error: "Quota exceeded"**
- Check your ElevenLabs usage limits
- Upgrade plan or wait for reset

### Twilio Call Failures

**Error: "Audio URL not accessible"**
- Ensure audio file is publicly accessible
- Check CORS settings on your storage
- Verify URL starts with `https://`

**Error: "From number not verified"**
- Use your verified Twilio phone number
- Check number format in dashboard settings

### n8n Workflow Issues

**Workflow stops unexpectedly**
- Check execution logs for errors
- Verify all credentials are active
- Ensure API endpoints are accessible

**Slow execution**
- Reduce batch size in "Split Clients"
- Increase wait time between calls
- Optimize audio file size

## Cost Estimation

### Per Voicemail Campaign (100 clients)

**ElevenLabs**:
- ~50 words per message × 100 clients = 5,000 characters
- Free tier: 10,000 characters/month ✅
- Paid: $5/month for 30,000 characters

**Twilio**:
- Calls: $0.013/minute × 0.5 minutes × 100 = $0.65
- Total: ~$0.65 per 100 calls

**Storage** (S3):
- ~100 KB per audio × 100 files = 10 MB
- S3: ~$0.023/GB = negligible cost

**Total Cost**: ~$0.65 per 100 personalized AI voicemails

## Monitoring & Analytics

View all activity in your LOGIXX Dashboard:
- Navigate to main dashboard
- Check "Recent Activity" section
- Filter for "n8n" entries

Track metrics:
- Calls made per campaign
- Success/failure rates
- Client responses (manual tracking)

## Next Steps

1. **Test thoroughly** with your own phone number
2. **Start small** with 5-10 clients
3. **Monitor results** in dashboard activity log
4. **Refine messages** based on response rates
5. **Scale up** gradually

## Support

- n8n Documentation: https://docs.n8n.io/
- ElevenLabs API: https://docs.elevenlabs.io/
- Twilio TwiML: https://www.twilio.com/docs/voice/twiml

## Example Use Cases

### Use Case 1: Payment Reminder Campaign
Send voicemails to clients with upcoming payment deadlines.

### Use Case 2: Settlement Offers
Call clients with special settlement offers based on debt amount.

### Use Case 3: Follow-up Calls
Automated follow-up after initial consultation.

### Use Case 4: Survey Requests
Ask clients to participate in satisfaction surveys.

## Security Notes

1. **API Keys**: Never commit API keys to version control
2. **Audio Files**: Delete old audio files regularly
3. **Client Data**: Ensure compliance with data protection laws
4. **Rate Limiting**: Implement to prevent abuse
5. **Logging**: Log all activities for audit trails

---

**Ready to start?** Import the workflow, configure your credentials, and test with a single client first!
