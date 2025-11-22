const nodemailer = require('nodemailer');
const crypto = require('crypto');

class EmailService {
    constructor(smtpConfig) {
        this.smtpConfig = smtpConfig;
        this.transporter = null;
        this.baseUrl = smtpConfig.trackingBaseUrl || 'http://localhost:3000';

        if (smtpConfig.host && smtpConfig.user && smtpConfig.pass) {
            this.transporter = nodemailer.createTransporter({
                host: smtpConfig.host,
                port: smtpConfig.port || 587,
                secure: smtpConfig.secure || false,
                auth: {
                    user: smtpConfig.user,
                    pass: smtpConfig.pass
                }
            });
        }
    }

    // Update SMTP configuration
    updateConfig(smtpConfig) {
        this.smtpConfig = smtpConfig;
        this.baseUrl = smtpConfig.trackingBaseUrl || 'http://localhost:3000';

        if (smtpConfig.host && smtpConfig.user && smtpConfig.pass) {
            this.transporter = nodemailer.createTransporter({
                host: smtpConfig.host,
                port: smtpConfig.port || 587,
                secure: smtpConfig.secure || false,
                auth: {
                    user: smtpConfig.user,
                    pass: smtpConfig.pass
                }
            });
        } else {
            this.transporter = null;
        }
    }

    // Check if email service is configured
    isConfigured() {
        return this.transporter !== null;
    }

    // Generate unique tracking ID
    generateTrackingId() {
        return crypto.randomBytes(16).toString('hex');
    }

    // Inject tracking pixel into HTML email
    injectTrackingPixel(htmlContent, trackingId) {
        const trackingPixel = `<img src="${this.baseUrl}/api/email/track/open/${trackingId}" width="1" height="1" style="display:none;" alt="" />`;

        // Try to insert before closing body tag, otherwise append
        if (htmlContent.includes('</body>')) {
            return htmlContent.replace('</body>', `${trackingPixel}</body>`);
        } else {
            return htmlContent + trackingPixel;
        }
    }

    // Inject link tracking into HTML
    injectLinkTracking(htmlContent, trackingId) {
        // Replace all href links with tracked versions
        const linkRegex = /href="([^"]+)"/g;
        let linkIndex = 0;

        return htmlContent.replace(linkRegex, (match, url) => {
            // Skip if already a tracking link or anchor link
            if (url.startsWith('#') || url.includes('/api/email/track/click/')) {
                return match;
            }

            linkIndex++;
            const trackedUrl = `${this.baseUrl}/api/email/track/click/${trackingId}/${linkIndex}?url=${encodeURIComponent(url)}`;
            return `href="${trackedUrl}"`;
        });
    }

    // Inject scroll depth tracking script
    injectScrollTracking(htmlContent, trackingId) {
        const scrollTrackingScript = `
        <script>
            (function() {
                var trackingId = '${trackingId}';
                var baseUrl = '${this.baseUrl}';
                var maxScroll = 0;
                var scrollIntervals = [25, 50, 75, 100];
                var trackedIntervals = [];
                var startTime = Date.now();
                var totalTimeSpent = 0;
                var isVisible = true;

                // Track scroll depth
                function trackScroll() {
                    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    var docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
                    var scrollPercent = Math.round((scrollTop / docHeight) * 100);

                    if (scrollPercent > maxScroll) {
                        maxScroll = scrollPercent;
                    }

                    // Track milestone intervals
                    scrollIntervals.forEach(function(interval) {
                        if (scrollPercent >= interval && trackedIntervals.indexOf(interval) === -1) {
                            trackedIntervals.push(interval);
                            fetch(baseUrl + '/api/email/track/scroll/' + trackingId, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ depth: interval })
                            }).catch(function() {});
                        }
                    });
                }

                // Track time spent
                function trackTimeSpent() {
                    if (isVisible) {
                        totalTimeSpent = Math.round((Date.now() - startTime) / 1000);
                        fetch(baseUrl + '/api/email/track/time/' + trackingId, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ timeSpent: totalTimeSpent })
                        }).catch(function() {});
                    }
                }

                // Track visibility changes
                document.addEventListener('visibilitychange', function() {
                    isVisible = !document.hidden;
                });

                // Set up event listeners
                window.addEventListener('scroll', trackScroll);
                window.addEventListener('beforeunload', trackTimeSpent);

                // Track time every 30 seconds
                setInterval(trackTimeSpent, 30000);
            })();
        </script>
        `;

        // Inject before closing body tag
        if (htmlContent.includes('</body>')) {
            return htmlContent.replace('</body>', `${scrollTrackingScript}</body>`);
        } else {
            return htmlContent + scrollTrackingScript;
        }
    }

    // Send tracked email
    async sendTrackedEmail(to, subject, htmlContent, trackingId) {
        if (!this.isConfigured()) {
            throw new Error('Email service is not configured');
        }

        // Inject all tracking mechanisms
        let trackedHtml = htmlContent;
        trackedHtml = this.injectTrackingPixel(trackedHtml, trackingId);
        trackedHtml = this.injectLinkTracking(trackedHtml, trackingId);
        trackedHtml = this.injectScrollTracking(trackedHtml, trackingId);

        try {
            const result = await this.transporter.sendMail({
                from: this.smtpConfig.fromEmail || this.smtpConfig.user,
                to: to,
                subject: subject,
                html: trackedHtml
            });

            return {
                success: true,
                messageId: result.messageId,
                trackingId: trackingId,
                to: to,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                trackingId: trackingId,
                to: to,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Send simple email without tracking
    async sendEmail(to, subject, htmlContent) {
        if (!this.isConfigured()) {
            throw new Error('Email service is not configured');
        }

        try {
            const result = await this.transporter.sendMail({
                from: this.smtpConfig.fromEmail || this.smtpConfig.user,
                to: to,
                subject: subject,
                html: htmlContent
            });

            return {
                success: true,
                messageId: result.messageId,
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

    // Send bulk tracked emails
    async sendBulkTrackedEmails(recipients, subject, htmlContent) {
        if (!this.isConfigured()) {
            throw new Error('Email service is not configured');
        }

        const results = [];

        for (const recipient of recipients) {
            const trackingId = this.generateTrackingId();
            const result = await this.sendTrackedEmail(recipient, subject, htmlContent, trackingId);
            results.push(result);

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return {
            total: recipients.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results: results
        };
    }

    // Test email configuration
    async testConfiguration() {
        if (!this.isConfigured()) {
            return {
                success: false,
                error: 'Email service is not configured'
            };
        }

        try {
            await this.transporter.verify();
            return {
                success: true,
                message: 'Email configuration is valid'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Generate HTML template
    static generateHtmlTemplate(recipientName, message, companyName = 'Better Debt Solutions') {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Message from ${companyName}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background: #f9f9f9;
            padding: 30px;
            border: 1px solid #ddd;
        }
        .footer {
            background: #333;
            color: #fff;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            border-radius: 0 0 8px 8px;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
        }
        .unsubscribe {
            color: #999;
            font-size: 11px;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${companyName}</h1>
    </div>
    <div class="content">
        <p>Hello ${recipientName},</p>
        ${message}
    </div>
    <div class="footer">
        <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        <p class="unsubscribe">
            If you no longer wish to receive these emails,
            <a href="#" style="color: #667eea;">unsubscribe here</a>.
        </p>
    </div>
</body>
</html>
        `.trim();
    }
}

module.exports = EmailService;
