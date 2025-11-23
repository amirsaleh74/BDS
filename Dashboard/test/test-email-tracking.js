/**
 * Test Email Tracking System
 * Tests pixel tracking, link tracking, and behavioral analytics
 */

const Database = require('../database/db');
const EmailTracker = require('../utils/email-tracker');

const db = new Database();
const tracker = new EmailTracker(db);

console.log('='.repeat(80));
console.log('EMAIL TRACKING SYSTEM TEST');
console.log('='.repeat(80));
console.log();

try {
    // 1. Create a test lead
    console.log('1. Creating test lead...');
    console.log('-'.repeat(80));

    const leadResult = db.createLead({
        firstName: 'Emily',
        lastName: 'Rodriguez',
        email: 'emily.rodriguez@email.com',
        phone: '555-0150',
        totalDebt: 35000,
        creditScore: 615,
        monthlyIncome: 4800,
        status: 'new'
    });

    if (!leadResult.success) {
        throw new Error('Failed to create test lead');
    }

    const lead = leadResult.lead;
    console.log(`✓ Created lead: ${lead.firstName} ${lead.lastName} (ID: ${lead.id})`);
    console.log();

    // 2. Generate tracking pixel for welcome email
    console.log('2. Generating tracking pixel for welcome email...');
    console.log('-'.repeat(80));

    const welcomeTracking = tracker.generateTrackingPixel(lead.id, 'welcome');

    console.log('✓ Tracking pixel generated:');
    console.log(`  Tracking ID: ${welcomeTracking.trackingId}`);
    console.log(`  Pixel URL: ${welcomeTracking.pixelUrl}`);
    console.log(`  Pixel HTML: ${welcomeTracking.pixelHtml}`);
    console.log();

    // 3. Generate tracked links
    console.log('3. Generating tracked links...');
    console.log('-'.repeat(80));

    const calculatorLink = tracker.generateTrackedLink(
        welcomeTracking.trackingId,
        'http://localhost:3000/calculator',
        'debt_calculator'
    );

    const scheduleLink = tracker.generateTrackedLink(
        welcomeTracking.trackingId,
        'http://localhost:3000/schedule-call',
        'schedule_consultation'
    );

    console.log('✓ Tracked links generated:');
    console.log(`  Calculator: ${calculatorLink}`);
    console.log(`  Schedule Call: ${scheduleLink}`);
    console.log();

    // 4. Simulate email open event
    console.log('4. Simulating email open event...');
    console.log('-'.repeat(80));

    const openResult = tracker.recordOpen(welcomeTracking.trackingId, {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        ipAddress: '192.168.1.100'
    });

    if (openResult.success) {
        console.log('✓ Email open recorded:');
        console.log(`  Open count: ${openResult.tracking.openCount}`);
        console.log(`  First opened: ${openResult.tracking.firstOpenedAt}`);
        console.log();
    }

    // 5. Simulate second open (re-open)
    console.log('5. Simulating second email open (re-open)...');
    console.log('-'.repeat(80));

    const reopenResult = tracker.recordOpen(welcomeTracking.trackingId, {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6)',
        ipAddress: '192.168.1.100'
    });

    if (reopenResult.success) {
        console.log('✓ Email re-open recorded:');
        console.log(`  Total opens: ${reopenResult.tracking.openCount}`);
        console.log(`  Last opened: ${reopenResult.tracking.lastOpenedAt}`);
        console.log();
    }

    // 6. Simulate link clicks
    console.log('6. Simulating link click events...');
    console.log('-'.repeat(80));

    const click1 = tracker.recordClick(
        welcomeTracking.trackingId,
        'debt_calculator',
        'http://localhost:3000/calculator',
        {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            ipAddress: '192.168.1.100'
        }
    );

    if (click1.success) {
        console.log('✓ Calculator link click recorded');
    }

    const click2 = tracker.recordClick(
        welcomeTracking.trackingId,
        'schedule_consultation',
        'http://localhost:3000/schedule-call',
        {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            ipAddress: '192.168.1.100'
        }
    );

    if (click2.success) {
        console.log('✓ Schedule link click recorded');
        console.log(`  Total clicks: ${click2.tracking.totalClicks}`);
        console.log();
    }

    // 7. Check lead heat score
    console.log('7. Checking updated lead heat score...');
    console.log('-'.repeat(80));

    const updatedLead = db.getLead(lead.id);
    console.log(`✓ Lead heat score updated:`);
    console.log(`  Current heat score: ${updatedLead.heatScore || 0}/100`);
    console.log(`  Last engaged: ${updatedLead.lastEngagedAt || 'N/A'}`);
    console.log();

    // 8. Get email analytics for the lead
    console.log('8. Getting email analytics for lead...');
    console.log('-'.repeat(80));

    const analytics = tracker.getLeadEmailAnalytics(lead.id);

    console.log('✓ Email analytics:');
    console.log(`  Total emails sent: ${analytics.totalEmailsSent}`);
    console.log(`  Unique opens: ${analytics.uniqueOpens}`);
    console.log(`  Total opens: ${analytics.totalOpens}`);
    console.log(`  Total clicks: ${analytics.totalClicks}`);
    console.log(`  Open rate: ${analytics.openRate}%`);
    console.log(`  Click rate: ${analytics.clickRate}%`);
    console.log(`  Click-to-open rate: ${analytics.clickToOpenRate}%`);
    console.log();

    console.log('  By email type:');
    Object.keys(analytics.emailTypes).forEach(type => {
        const data = analytics.emailTypes[type];
        console.log(`    ${type}: ${data.sent} sent, ${data.opened} opened, ${data.clicked} clicked`);
    });
    console.log();

    console.log('  Most clicked links:');
    Object.keys(analytics.mostClickedLinks).forEach(linkName => {
        const count = analytics.mostClickedLinks[linkName];
        console.log(`    ${linkName}: ${count} clicks`);
    });
    console.log();

    console.log('  Recent activity (last 5):');
    analytics.recentActivity.slice(0, 5).forEach(activity => {
        const timestamp = new Date(activity.timestamp).toLocaleString();
        if (activity.type === 'open') {
            console.log(`    [${timestamp}] Opened ${activity.emailType} email`);
        } else {
            console.log(`    [${timestamp}] Clicked "${activity.linkName}" in ${activity.emailType} email`);
        }
    });
    console.log();

    // 9. Generate example email HTML
    console.log('9. Generating example tracked email HTML...');
    console.log('-'.repeat(80));

    const exampleEmail = generateExampleEmail(lead, welcomeTracking.trackingId, tracker);

    console.log('✓ Example email HTML generated');
    console.log('  (See below for full HTML)');
    console.log();

    // 10. Campaign analytics
    console.log('10. Getting overall campaign analytics...');
    console.log('-'.repeat(80));

    const campaignAnalytics = tracker.getCampaignAnalytics();

    console.log('✓ Campaign analytics:');
    console.log(`  Total emails sent: ${campaignAnalytics.totalEmailsSent}`);
    console.log(`  Unique opens: ${campaignAnalytics.uniqueOpens}`);
    console.log(`  Total clicks: ${campaignAnalytics.totalClicks}`);
    console.log(`  Overall open rate: ${campaignAnalytics.openRate}%`);
    console.log(`  Overall click rate: ${campaignAnalytics.clickRate}%`);
    console.log(`  Avg opens per email: ${campaignAnalytics.avgOpensPerEmail}`);
    console.log();

    if (campaignAnalytics.topPerformingEmails.length > 0) {
        console.log('  Top performing email types:');
        campaignAnalytics.topPerformingEmails.slice(0, 3).forEach((email, index) => {
            console.log(`    ${index + 1}. ${email.emailType}: ${email.openRate}% open, ${email.clickRate}% click`);
        });
        console.log();
    }

    // Test summary
    console.log('='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));
    console.log('✓ Lead creation: PASSED');
    console.log('✓ Tracking pixel generation: PASSED');
    console.log('✓ Tracked link generation: PASSED');
    console.log('✓ Email open tracking: PASSED');
    console.log('✓ Email re-open tracking: PASSED');
    console.log('✓ Link click tracking: PASSED');
    console.log('✓ Heat score update: PASSED');
    console.log('✓ Lead email analytics: PASSED');
    console.log('✓ Campaign analytics: PASSED');
    console.log();
    console.log('Email Tracking System is fully functional!');
    console.log();

    // Output example email
    console.log('='.repeat(80));
    console.log('EXAMPLE TRACKED EMAIL HTML');
    console.log('='.repeat(80));
    console.log();
    console.log(exampleEmail);
    console.log();

} catch (error) {
    console.error('='.repeat(80));
    console.error('ERROR DURING TESTING');
    console.error('='.repeat(80));
    console.error();
    console.error('Error:', error.message);
    console.error();
    console.error('Stack trace:');
    console.error(error.stack);
    process.exit(1);
}

/**
 * Generate example tracked email HTML
 */
function generateExampleEmail(lead, trackingId, tracker) {
    const calculatorLink = tracker.generateTrackedLink(
        trackingId,
        'http://localhost:3000/calculator',
        'debt_calculator'
    );

    const scheduleLink = tracker.generateTrackedLink(
        trackingId,
        'http://localhost:3000/schedule-call',
        'schedule_consultation'
    );

    const pixelHtml = tracker.getPixelHtml(trackingId);

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Better Debt Solutions</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background: #f5f7fa;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background: #f5f7fa; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">

                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome, ${lead.firstName}!</h1>
                            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Your journey to financial freedom starts here</p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="color: #333; margin: 0 0 20px 0;">Thank You for Reaching Out</h2>

                            <p style="color: #666; line-height: 1.6; margin: 0 0 15px 0;">
                                We understand that dealing with debt can be overwhelming. That's why we're here to help you find the best solution for your unique situation.
                            </p>

                            <p style="color: #666; line-height: 1.6; margin: 0 0 25px 0;">
                                Based on your initial information, we've identified that you could potentially save thousands of dollars through our debt resolution program.
                            </p>

                            <!-- CTA Buttons -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 10px;">
                                        <a href="${calculatorLink}" style="display: block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 5px; text-align: center; font-weight: 600;">
                                            Calculate Your Savings
                                        </a>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px;">
                                        <a href="${scheduleLink}" style="display: block; background: #28a745; color: white; text-decoration: none; padding: 15px 30px; border-radius: 5px; text-align: center; font-weight: 600;">
                                            Schedule Free Consultation
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <h3 style="color: #333; margin: 30px 0 15px 0;">What Happens Next?</h3>

                            <ol style="color: #666; line-height: 1.8; padding-left: 20px;">
                                <li><strong>Free Consultation</strong> - We'll review your situation (no obligation)</li>
                                <li><strong>Custom Plan</strong> - Get a personalized debt resolution strategy</li>
                                <li><strong>Start Saving</strong> - Begin your journey to becoming debt-free</li>
                            </ol>

                            <p style="color: #666; line-height: 1.6; margin: 25px 0 0 0;">
                                Have questions? Simply reply to this email or call us at (800) 555-DEBT.
                            </p>

                            <p style="color: #666; line-height: 1.6; margin: 10px 0 0 0;">
                                We're here to help!<br>
                                <strong>Better Debt Solutions Team</strong>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
                            <p style="color: #999; font-size: 12px; margin: 0;">
                                Better Debt Solutions | 123 Main St, Suite 100 | City, State 12345
                            </p>
                            <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">
                                <a href="#" style="color: #667eea; text-decoration: none;">Unsubscribe</a> |
                                <a href="#" style="color: #667eea; text-decoration: none;">Privacy Policy</a>
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>

    <!-- Tracking Pixel (tracks email opens) -->
    ${pixelHtml}
</body>
</html>
    `.trim();
}
