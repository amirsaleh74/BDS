const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const fs = require('fs');

async function generateCSV(files) {
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const csvPath = path.join(tempDir, `logixx-export-${timestamp}.csv`);

    const csvWriter = createObjectCsvWriter({
        path: csvPath,
        header: [
            { id: 'appId', title: 'App ID' },
            { id: 'alv', title: 'ALV Number' },
            { id: 'name', title: 'Client Name' },
            { id: 'phone', title: 'Phone Number' },
            { id: 'email', title: 'Email' },
            { id: 'status', title: 'File Status' },
            { id: 'debtAmount', title: 'Debt Amount' },
            { id: 'notes', title: 'Notes' },
            { id: 'addedAt', title: 'Date Added' },
            { id: 'lastUpdated', title: 'Last Updated' }
        ]
    });

    await csvWriter.writeRecords(files);

    return csvPath;
}

module.exports = {
    generateCSV
};
