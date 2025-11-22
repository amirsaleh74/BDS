const twilio = require('twilio');

class TwilioService {
    constructor(accountSid, authToken, phoneNumber) {
        this.accountSid = accountSid;
        this.authToken = authToken;
        this.phoneNumber = phoneNumber;
        this.client = null;

        if (accountSid && authToken) {
            this.client = twilio(accountSid, authToken);
        }
    }

    // Initialize or update Twilio client
    updateCredentials(accountSid, authToken, phoneNumber) {
        this.accountSid = accountSid;
        this.authToken = authToken;
        this.phoneNumber = phoneNumber;

        if (accountSid && authToken) {
            this.client = twilio(accountSid, authToken);
        } else {
            this.client = null;
        }
    }

    // Validate Twilio credentials
    isConfigured() {
        return this.client !== null && this.phoneNumber !== null;
    }

    // Send SMS to a single recipient
    async sendSMS(to, message) {
        if (!this.isConfigured()) {
            throw new Error('Twilio is not configured. Please add your credentials in settings.');
        }

        try {
            const result = await this.client.messages.create({
                body: message,
                from: this.phoneNumber,
                to: to
            });

            return {
                success: true,
                messageId: result.sid,
                status: result.status,
                to: to,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                to: to,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Send SMS to multiple recipients (bulk SMS)
    async sendBulkSMS(recipients, message) {
        if (!this.isConfigured()) {
            throw new Error('Twilio is not configured. Please add your credentials in settings.');
        }

        const results = [];

        for (const recipient of recipients) {
            const result = await this.sendSMS(recipient, message);
            results.push(result);

            // Add small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return {
            total: recipients.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results: results
        };
    }

    // Make a phone call
    async makeCall(to, messageText, voiceUrl = null) {
        if (!this.isConfigured()) {
            throw new Error('Twilio is not configured. Please add your credentials in settings.');
        }

        try {
            // If no voice URL provided, use TwiML to speak the message
            const twiml = voiceUrl || `
                <Response>
                    <Say voice="alice">${this.escapeXml(messageText)}</Say>
                </Response>
            `;

            const result = await this.client.calls.create({
                twiml: twiml,
                to: to,
                from: this.phoneNumber
            });

            return {
                success: true,
                callId: result.sid,
                status: result.status,
                to: to,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                to: to,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Make bulk calls
    async makeBulkCalls(recipients, messageText, voiceUrl = null) {
        if (!this.isConfigured()) {
            throw new Error('Twilio is not configured. Please add your credentials in settings.');
        }

        const results = [];

        for (const recipient of recipients) {
            const result = await this.makeCall(recipient, messageText, voiceUrl);
            results.push(result);

            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return {
            total: recipients.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results: results
        };
    }

    // Get message history
    async getMessageHistory(limit = 20) {
        if (!this.isConfigured()) {
            throw new Error('Twilio is not configured. Please add your credentials in settings.');
        }

        try {
            const messages = await this.client.messages.list({ limit });

            return messages.map(msg => ({
                sid: msg.sid,
                to: msg.to,
                from: msg.from,
                body: msg.body,
                status: msg.status,
                direction: msg.direction,
                dateCreated: msg.dateCreated,
                dateSent: msg.dateSent
            }));
        } catch (error) {
            throw new Error(`Failed to fetch message history: ${error.message}`);
        }
    }

    // Get call history
    async getCallHistory(limit = 20) {
        if (!this.isConfigured()) {
            throw new Error('Twilio is not configured. Please add your credentials in settings.');
        }

        try {
            const calls = await this.client.calls.list({ limit });

            return calls.map(call => ({
                sid: call.sid,
                to: call.to,
                from: call.from,
                status: call.status,
                direction: call.direction,
                duration: call.duration,
                dateCreated: call.dateCreated
            }));
        } catch (error) {
            throw new Error(`Failed to fetch call history: ${error.message}`);
        }
    }

    // Verify phone number format
    validatePhoneNumber(phoneNumber) {
        // Basic E.164 format validation
        const e164Regex = /^\+[1-9]\d{1,14}$/;
        return e164Regex.test(phoneNumber);
    }

    // Format phone number to E.164
    formatPhoneNumber(phoneNumber) {
        // Remove all non-numeric characters
        let cleaned = phoneNumber.replace(/\D/g, '');

        // If it starts with 1 and is 11 digits (US/Canada), add +
        if (cleaned.length === 11 && cleaned.startsWith('1')) {
            return '+' + cleaned;
        }

        // If it's 10 digits (US/Canada), add +1
        if (cleaned.length === 10) {
            return '+1' + cleaned;
        }

        // If it already has +, return as is
        if (phoneNumber.startsWith('+')) {
            return phoneNumber;
        }

        // Otherwise, assume it needs +1 (US/Canada)
        return '+1' + cleaned;
    }

    // Escape XML special characters for TwiML
    escapeXml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    // Test Twilio credentials
    async testCredentials() {
        if (!this.isConfigured()) {
            return {
                success: false,
                error: 'Twilio credentials not configured'
            };
        }

        try {
            // Try to fetch account details to verify credentials
            const account = await this.client.api.accounts(this.accountSid).fetch();

            return {
                success: true,
                accountName: account.friendlyName,
                status: account.status
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = TwilioService;
