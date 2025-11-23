/**
 * Email Tracking Utility
 * Tracks email opens, link clicks, and builds behavioral analytics
 */

const crypto = require('crypto');

class EmailTracker {
    constructor(database) {
        this.db = database;
    }

    /**
     * Generate tracking pixel for email
     * @param {String} leadId - Lead ID
     * @param {String} emailType - Type of email (welcome, follow_up, quote, etc.)
     * @returns {Object} Tracking data
     */
    generateTrackingPixel(leadId, emailType = 'general') {
        // Generate unique tracking ID
        const trackingId = this.generateTrackingId(leadId, emailType);

        // Store tracking record
        const trackingData = {
            id: trackingId,
            leadId: leadId,
            emailType: emailType,
            createdAt: new Date().toISOString(),
            opened: false,
            openCount: 0,
            firstOpenedAt: null,
            lastOpenedAt: null,
            clicks: [],
            totalClicks: 0,
            userAgent: null,
            ipAddress: null
        };

        this.saveTracking(trackingData);

        // Return pixel URL and HTML
        return {
            trackingId: trackingId,
            pixelUrl: this.getPixelUrl(trackingId),
            pixelHtml: this.getPixelHtml(trackingId)
        };
    }

    /**
     * Generate tracking ID (unique hash)
     */
    generateTrackingId(leadId, emailType) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const data = `${leadId}-${emailType}-${timestamp}-${random}`;

        return crypto
            .createHash('sha256')
            .update(data)
            .digest('hex')
            .substring(0, 32);
    }

    /**
     * Get pixel URL
     */
    getPixelUrl(trackingId) {
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        return `${baseUrl}/api/track/pixel/${trackingId}`;
    }

    /**
     * Get pixel HTML
     */
    getPixelHtml(trackingId) {
        const pixelUrl = this.getPixelUrl(trackingId);
        return `<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" />`;
    }

    /**
     * Generate tracked link
     * @param {String} trackingId - Tracking ID from email
     * @param {String} url - Original URL to track
     * @param {String} linkName - Name/identifier for the link
     * @returns {String} Tracked URL
     */
    generateTrackedLink(trackingId, url, linkName = 'link') {
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const encodedUrl = encodeURIComponent(url);
        const encodedName = encodeURIComponent(linkName);

        return `${baseUrl}/api/track/click/${trackingId}?url=${encodedUrl}&name=${encodedName}`;
    }

    /**
     * Record email open event
     * @param {String} trackingId - Tracking ID
     * @param {Object} metadata - User agent, IP, etc.
     */
    recordOpen(trackingId, metadata = {}) {
        const tracking = this.getTracking(trackingId);

        if (!tracking) {
            return { success: false, error: 'Tracking ID not found' };
        }

        const now = new Date().toISOString();

        // Update tracking data
        tracking.opened = true;
        tracking.openCount = (tracking.openCount || 0) + 1;
        tracking.lastOpenedAt = now;

        if (!tracking.firstOpenedAt) {
            tracking.firstOpenedAt = now;
        }

        if (metadata.userAgent) {
            tracking.userAgent = metadata.userAgent;
        }

        if (metadata.ipAddress) {
            tracking.ipAddress = metadata.ipAddress;
        }

        this.saveTracking(tracking);

        // Update lead heat score
        this.updateLeadHeatScore(tracking.leadId, 'email_open', {
            emailType: tracking.emailType,
            openCount: tracking.openCount
        });

        // Log activity
        this.db.addLeadActivity(tracking.leadId, {
            type: 'email_opened',
            description: `Opened email: ${tracking.emailType}`,
            metadata: {
                trackingId,
                openCount: tracking.openCount,
                userAgent: metadata.userAgent
            },
            userId: null,
            username: 'system'
        });

        return {
            success: true,
            tracking: tracking
        };
    }

    /**
     * Record link click event
     * @param {String} trackingId - Tracking ID
     * @param {String} linkName - Name of clicked link
     * @param {String} url - Target URL
     * @param {Object} metadata - User agent, IP, etc.
     */
    recordClick(trackingId, linkName, url, metadata = {}) {
        const tracking = this.getTracking(trackingId);

        if (!tracking) {
            return { success: false, error: 'Tracking ID not found' };
        }

        const now = new Date().toISOString();

        // Initialize clicks array if needed
        if (!tracking.clicks) {
            tracking.clicks = [];
        }

        // Record click
        tracking.clicks.push({
            linkName: linkName,
            url: url,
            clickedAt: now,
            userAgent: metadata.userAgent,
            ipAddress: metadata.ipAddress
        });

        tracking.totalClicks = tracking.clicks.length;

        this.saveTracking(tracking);

        // Update lead heat score (clicks are more valuable than opens)
        this.updateLeadHeatScore(tracking.leadId, 'email_click', {
            emailType: tracking.emailType,
            linkName: linkName,
            url: url
        });

        // Log activity
        this.db.addLeadActivity(tracking.leadId, {
            type: 'email_link_clicked',
            description: `Clicked link: ${linkName}`,
            metadata: {
                trackingId,
                linkName,
                url,
                totalClicks: tracking.totalClicks
            },
            userId: null,
            username: 'system'
        });

        return {
            success: true,
            tracking: tracking,
            redirectUrl: url
        };
    }

    /**
     * Update lead heat score based on email engagement
     * @param {String} leadId - Lead ID
     * @param {String} eventType - 'email_open' or 'email_click'
     * @param {Object} metadata - Event metadata
     */
    updateLeadHeatScore(leadId, eventType, metadata = {}) {
        const lead = this.db.getLead(leadId);

        if (!lead) {
            return;
        }

        let currentHeatScore = lead.heatScore || 0;
        let points = 0;

        // Calculate points based on event type
        if (eventType === 'email_open') {
            // First open = 5 points, subsequent opens = 2 points
            points = metadata.openCount === 1 ? 5 : 2;

            // Bonus for opening specific email types
            if (['quote', 'settlement_offer', 'enrollment'].includes(metadata.emailType)) {
                points += 3; // Higher intent emails
            }
        } else if (eventType === 'email_click') {
            // Clicks are worth more than opens
            points = 10;

            // Bonus for clicking high-intent links
            if (metadata.linkName && metadata.linkName.toLowerCase().includes('schedule')) {
                points += 10; // Wants to schedule = very hot
            } else if (metadata.linkName && metadata.linkName.toLowerCase().includes('quote')) {
                points += 7;
            } else if (metadata.linkName && metadata.linkName.toLowerCase().includes('calculator')) {
                points += 5;
            }
        }

        // Update heat score (cap at 100)
        const newHeatScore = Math.min(100, currentHeatScore + points);

        this.db.updateLead(leadId, {
            heatScore: newHeatScore,
            lastEngagedAt: new Date().toISOString()
        });

        // If heat score crosses threshold, update close probability
        if (newHeatScore >= 60 && currentHeatScore < 60) {
            // Lead just became "warm" - recalculate scoring
            this.db.updateLeadScoring(leadId);
        }

        return newHeatScore;
    }

    /**
     * Get email engagement analytics for a lead
     * @param {String} leadId - Lead ID
     * @returns {Object} Analytics data
     */
    getLeadEmailAnalytics(leadId) {
        const allTracking = this.getAllTracking();
        const leadTracking = allTracking.filter(t => t.leadId === leadId);

        const analytics = {
            totalEmailsSent: leadTracking.length,
            totalOpens: 0,
            totalClicks: 0,
            uniqueOpens: 0,
            openRate: 0,
            clickRate: 0,
            clickToOpenRate: 0,
            emailTypes: {},
            recentActivity: [],
            mostClickedLinks: {}
        };

        leadTracking.forEach(tracking => {
            // Counts
            if (tracking.opened) {
                analytics.uniqueOpens++;
                analytics.totalOpens += tracking.openCount || 0;
            }

            analytics.totalClicks += tracking.totalClicks || 0;

            // By email type
            if (!analytics.emailTypes[tracking.emailType]) {
                analytics.emailTypes[tracking.emailType] = {
                    sent: 0,
                    opened: 0,
                    clicked: 0
                };
            }

            analytics.emailTypes[tracking.emailType].sent++;
            if (tracking.opened) {
                analytics.emailTypes[tracking.emailType].opened++;
            }
            if (tracking.totalClicks > 0) {
                analytics.emailTypes[tracking.emailType].clicked++;
            }

            // Recent activity
            if (tracking.lastOpenedAt) {
                analytics.recentActivity.push({
                    type: 'open',
                    emailType: tracking.emailType,
                    timestamp: tracking.lastOpenedAt
                });
            }

            if (tracking.clicks && tracking.clicks.length > 0) {
                tracking.clicks.forEach(click => {
                    analytics.recentActivity.push({
                        type: 'click',
                        emailType: tracking.emailType,
                        linkName: click.linkName,
                        timestamp: click.clickedAt
                    });

                    // Track most clicked links
                    if (!analytics.mostClickedLinks[click.linkName]) {
                        analytics.mostClickedLinks[click.linkName] = 0;
                    }
                    analytics.mostClickedLinks[click.linkName]++;
                });
            }
        });

        // Calculate rates
        if (analytics.totalEmailsSent > 0) {
            analytics.openRate = Math.round((analytics.uniqueOpens / analytics.totalEmailsSent) * 100);
            analytics.clickRate = Math.round((analytics.totalClicks / analytics.totalEmailsSent) * 100);
        }

        if (analytics.uniqueOpens > 0) {
            analytics.clickToOpenRate = Math.round((analytics.totalClicks / analytics.uniqueOpens) * 100);
        }

        // Sort recent activity by timestamp
        analytics.recentActivity.sort((a, b) =>
            new Date(b.timestamp) - new Date(a.timestamp)
        );

        return analytics;
    }

    /**
     * Get tracking data
     */
    getTracking(trackingId) {
        const allTracking = this.getAllTracking();
        return allTracking.find(t => t.id === trackingId);
    }

    /**
     * Save tracking data
     */
    saveTracking(trackingData) {
        const allTracking = this.getAllTracking();
        const index = allTracking.findIndex(t => t.id === trackingData.id);

        if (index >= 0) {
            allTracking[index] = trackingData;
        } else {
            allTracking.push(trackingData);
        }

        const trackingFile = this.db.dataDir + '/email-tracking.json';
        this.db.saveData(trackingFile, allTracking);
    }

    /**
     * Get all tracking data
     */
    getAllTracking() {
        const trackingFile = this.db.dataDir + '/email-tracking.json';
        const data = this.db.loadData(trackingFile);

        // Ensure we always return an array
        if (!data) {
            return [];
        }

        if (Array.isArray(data)) {
            return data;
        }

        // If data is not an array, return empty array
        return [];
    }

    /**
     * Clean up old tracking data (older than 90 days)
     */
    cleanupOldTracking() {
        const allTracking = this.getAllTracking();
        const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);

        const activeTracking = allTracking.filter(t => {
            const createdAt = new Date(t.createdAt).getTime();
            return createdAt >= ninetyDaysAgo;
        });

        const trackingFile = this.db.dataDir + '/email-tracking.json';
        this.db.saveData(trackingFile, activeTracking);

        return {
            removed: allTracking.length - activeTracking.length,
            remaining: activeTracking.length
        };
    }

    /**
     * Get overall email campaign analytics
     */
    getCampaignAnalytics() {
        const allTracking = this.getAllTracking();

        const analytics = {
            totalEmailsSent: allTracking.length,
            uniqueOpens: 0,
            totalOpens: 0,
            totalClicks: 0,
            openRate: 0,
            clickRate: 0,
            avgOpensPerEmail: 0,
            byEmailType: {},
            topPerformingEmails: [],
            recentActivity: []
        };

        allTracking.forEach(tracking => {
            if (tracking.opened) {
                analytics.uniqueOpens++;
                analytics.totalOpens += tracking.openCount || 0;
            }

            analytics.totalClicks += tracking.totalClicks || 0;

            // By type
            if (!analytics.byEmailType[tracking.emailType]) {
                analytics.byEmailType[tracking.emailType] = {
                    sent: 0,
                    opened: 0,
                    clicks: 0
                };
            }

            analytics.byEmailType[tracking.emailType].sent++;
            if (tracking.opened) {
                analytics.byEmailType[tracking.emailType].opened++;
            }
            analytics.byEmailType[tracking.emailType].clicks += tracking.totalClicks || 0;
        });

        // Calculate rates
        if (analytics.totalEmailsSent > 0) {
            analytics.openRate = Math.round((analytics.uniqueOpens / analytics.totalEmailsSent) * 100);
            analytics.clickRate = Math.round((analytics.totalClicks / analytics.totalEmailsSent) * 100);
            analytics.avgOpensPerEmail = (analytics.totalOpens / analytics.totalEmailsSent).toFixed(1);
        }

        // Calculate performance by email type
        analytics.topPerformingEmails = Object.keys(analytics.byEmailType)
            .map(type => {
                const data = analytics.byEmailType[type];
                const openRate = data.sent > 0 ? Math.round((data.opened / data.sent) * 100) : 0;
                const clickRate = data.sent > 0 ? Math.round((data.clicks / data.sent) * 100) : 0;

                return {
                    emailType: type,
                    sent: data.sent,
                    openRate,
                    clickRate,
                    score: openRate + (clickRate * 2) // Clicks worth 2x
                };
            })
            .sort((a, b) => b.score - a.score);

        return analytics;
    }
}

module.exports = EmailTracker;
