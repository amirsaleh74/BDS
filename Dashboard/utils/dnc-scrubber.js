/**
 * DNC (Do Not Call) Scrubber Service
 *
 * This service helps manage and scrub phone numbers against Do Not Call lists
 * to ensure compliance with TCPA regulations.
 */

class DNCScr

ubber {
    constructor(database) {
        this.db = database;
    }

    /**
     * Check if a phone number is on the internal DNC list
     */
    isOnDNCList(phoneNumber) {
        const cleanedNumber = this.cleanPhoneNumber(phoneNumber);
        return this.db.isOnDNCList(cleanedNumber);
    }

    /**
     * Scrub a list of phone numbers against DNC list
     * Returns object with allowed and blocked numbers
     */
    scrubPhoneNumbers(phoneNumbers) {
        const allowed = [];
        const blocked = [];

        phoneNumbers.forEach(phoneNumber => {
            const cleanedNumber = this.cleanPhoneNumber(phoneNumber);

            if (this.isOnDNCList(cleanedNumber)) {
                blocked.push({
                    phoneNumber: phoneNumber,
                    cleanedNumber: cleanedNumber,
                    reason: 'On DNC List'
                });
            } else {
                allowed.push(phoneNumber);
            }
        });

        return {
            totalNumbers: phoneNumbers.length,
            allowed: allowed,
            blocked: blocked,
            allowedCount: allowed.length,
            blockedCount: blocked.length
        };
    }

    /**
     * Add phone number to DNC list
     */
    addToDNCList(phoneNumber, reason = 'Manual', source = 'Internal') {
        const cleanedNumber = this.cleanPhoneNumber(phoneNumber);
        return this.db.addToDNCList(cleanedNumber, reason, source);
    }

    /**
     * Remove phone number from DNC list
     */
    removeFromDNCList(phoneNumber) {
        const cleanedNumber = this.cleanPhoneNumber(phoneNumber);
        return this.db.removeFromDNCList(cleanedNumber);
    }

    /**
     * Bulk add phone numbers to DNC list
     */
    bulkAddToDNCList(phoneNumbers, reason = 'Bulk Import', source = 'Import') {
        const cleanedNumbers = phoneNumbers.map(num => this.cleanPhoneNumber(num));
        return this.db.bulkAddToDNCList(cleanedNumbers, reason, source);
    }

    /**
     * Get all numbers on DNC list
     */
    getDNCList() {
        return this.db.getDNCList();
    }

    /**
     * Clean phone number to standardized format
     * Removes all non-digit characters and formats to E.164
     */
    cleanPhoneNumber(phoneNumber) {
        if (!phoneNumber) return '';

        // Remove all non-digit characters
        let cleaned = phoneNumber.replace(/\D/g, '');

        // If it starts with 1 and is 11 digits (US/Canada), keep as is
        if (cleaned.length === 11 && cleaned.startsWith('1')) {
            return '+' + cleaned;
        }

        // If it's 10 digits (US/Canada), add +1
        if (cleaned.length === 10) {
            return '+1' + cleaned;
        }

        // If it already has +, return the original
        if (phoneNumber.startsWith('+')) {
            return phoneNumber;
        }

        // Otherwise, assume it needs +1 (US/Canada default)
        return '+1' + cleaned;
    }

    /**
     * Import DNC list from CSV content
     * Expected format: phoneNumber,reason,source
     */
    importFromCSV(csvContent) {
        const lines = csvContent.split('\n');
        const imported = [];
        const errors = [];

        // Skip header if present
        const startIndex = lines[0].toLowerCase().includes('phone') ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split(',');
            const phoneNumber = parts[0]?.trim();
            const reason = parts[1]?.trim() || 'CSV Import';
            const source = parts[2]?.trim() || 'CSV';

            if (phoneNumber) {
                try {
                    const cleaned = this.cleanPhoneNumber(phoneNumber);
                    if (this.addToDNCList(cleaned, reason, source)) {
                        imported.push(cleaned);
                    }
                } catch (error) {
                    errors.push({
                        line: i + 1,
                        phoneNumber: phoneNumber,
                        error: error.message
                    });
                }
            }
        }

        return {
            imported: imported.length,
            errors: errors.length,
            errorDetails: errors
        };
    }

    /**
     * Export DNC list to CSV format
     */
    exportToCSV() {
        const dncList = this.getDNCList();
        let csv = 'Phone Number,Reason,Source,Added Date\n';

        dncList.forEach(entry => {
            csv += `${entry.phoneNumber},${entry.reason},${entry.source},${entry.addedAt}\n`;
        });

        return csv;
    }

    /**
     * Get statistics about DNC list
     */
    getStatistics() {
        const dncList = this.getDNCList();

        const sourceBreakdown = {};
        const reasonBreakdown = {};

        dncList.forEach(entry => {
            sourceBreakdown[entry.source] = (sourceBreakdown[entry.source] || 0) + 1;
            reasonBreakdown[entry.reason] = (reasonBreakdown[entry.reason] || 0) + 1;
        });

        return {
            total: dncList.length,
            sourceBreakdown: sourceBreakdown,
            reasonBreakdown: reasonBreakdown,
            lastAdded: dncList.length > 0 ? dncList[dncList.length - 1] : null
        };
    }

    /**
     * Check against federal DNC registry (requires API integration)
     * This is a placeholder for future integration with DNC.gov or similar service
     */
    async checkFederalDNC(phoneNumber) {
        // TODO: Integrate with federal DNC registry API
        // For now, just check local list
        return {
            isOnFederalDNC: false,
            isOnLocalDNC: this.isOnDNCList(phoneNumber),
            message: 'Federal DNC check not yet implemented. Checking local list only.'
        };
    }

    /**
     * Validate phone number format
     */
    isValidPhoneNumber(phoneNumber) {
        const cleaned = phoneNumber.replace(/\D/g, '');
        // US/Canada: 10 or 11 digits
        return cleaned.length === 10 || (cleaned.length === 11 && cleaned.startsWith('1'));
    }
}

module.exports = DNCScr

ubber;
