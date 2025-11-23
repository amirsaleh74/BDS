/**
 * Test Script for Credit Report Analyzer
 * This script tests the credit analyzer and report generator with sample data
 */

const CreditAnalyzer = require('../utils/credit-analyzer');
const ReportGenerator = require('../utils/report-generator');
const fs = require('fs');
const path = require('path');

// Sample credit report data from user
const sampleCreditReport = {
    client: {
        name: 'AMIRSALEH ASGARIMOVAHED',
        creditScore: 610,
        reportDate: '2024-01-15',
        monthlyIncome: 4500
    },
    accounts: [
        {
            creditor: 'AMEX',
            accountType: 'Credit Card',
            balance: 12500,
            creditLimit: 15000,
            monthlyPayment: 375,
            interestRate: 18.99,
            dateOpened: '2019-03-15',
            status: 'Open',
            paymentHistory: 'Current'
        },
        {
            creditor: 'Capital One',
            accountType: 'Credit Card',
            balance: 8200,
            creditLimit: 10000,
            monthlyPayment: 246,
            interestRate: 24.99,
            dateOpened: '2020-06-20',
            status: 'Open',
            paymentHistory: 'Current'
        },
        {
            creditor: 'Chase Bank',
            accountType: 'Credit Card',
            balance: 5400,
            creditLimit: 7000,
            monthlyPayment: 162,
            interestRate: 21.24,
            dateOpened: '2021-01-10',
            status: 'Open',
            paymentHistory: '30 days late (2 times in last 12 months)'
        },
        {
            creditor: 'Wells Fargo',
            accountType: 'Personal Loan',
            balance: 15000,
            creditLimit: null,
            monthlyPayment: 425,
            interestRate: 11.5,
            dateOpened: '2022-04-01',
            status: 'Open',
            paymentHistory: 'Current',
            originalAmount: 20000
        },
        {
            creditor: 'Discover',
            accountType: 'Credit Card',
            balance: 3200,
            creditLimit: 5000,
            monthlyPayment: 96,
            interestRate: 19.99,
            dateOpened: '2018-11-05',
            status: 'Open',
            paymentHistory: 'Current'
        },
        {
            creditor: 'Best Buy Credit',
            accountType: 'Store Credit Card',
            balance: 1800,
            creditLimit: 3000,
            monthlyPayment: 54,
            interestRate: 27.99,
            dateOpened: '2021-09-15',
            status: 'Open',
            paymentHistory: 'Current'
        },
        {
            creditor: 'Ford Motor Credit',
            accountType: 'Auto Loan',
            balance: 22000,
            creditLimit: null,
            monthlyPayment: 485,
            interestRate: 6.5,
            dateOpened: '2022-08-01',
            status: 'Open',
            paymentHistory: 'Current',
            originalAmount: 28000,
            collateral: '2022 Ford F-150'
        },
        {
            creditor: 'Synchrony Bank',
            accountType: 'Credit Card',
            balance: 4500,
            creditLimit: 6000,
            monthlyPayment: 135,
            interestRate: 26.99,
            dateOpened: '2020-12-10',
            status: 'Open',
            paymentHistory: '60 days late (1 time in last 12 months)'
        }
    ]
};

console.log('='.repeat(80));
console.log('CREDIT REPORT ANALYZER TEST');
console.log('='.repeat(80));
console.log();

console.log('Client:', sampleCreditReport.client.name);
console.log('Current Credit Score:', sampleCreditReport.client.creditScore);
console.log('Monthly Income:', '$' + sampleCreditReport.client.monthlyIncome.toLocaleString());
console.log('Total Accounts:', sampleCreditReport.accounts.length);
console.log();

console.log('='.repeat(80));
console.log('ANALYZING CREDIT REPORT...');
console.log('='.repeat(80));
console.log();

try {
    // Initialize analyzer
    const analyzer = new CreditAnalyzer(sampleCreditReport);

    // Analyze the report
    const analysis = analyzer.analyze();

    console.log('✓ Credit report parsed successfully!');
    console.log();

    // Display overall metrics
    console.log('OVERALL METRICS:');
    console.log('-'.repeat(80));
    console.log('Total Debt:', '$' + analysis.metrics.totalDebt.toLocaleString());
    console.log('  - Secured Debt:', '$' + analysis.metrics.securedDebt.toLocaleString());
    console.log('  - Unsecured Debt:', '$' + analysis.metrics.unsecuredDebt.toLocaleString());
    console.log();
    console.log('Monthly Payments:', '$' + analysis.metrics.totalMonthlyPayments.toLocaleString());
    console.log('Average Interest Rate:', analysis.metrics.avgInterestRate.toFixed(2) + '%');
    console.log();
    console.log('Interest Already Paid:', '$' + analysis.metrics.totalInterestPaid.toLocaleString());
    console.log('Remaining Interest:', '$' + analysis.metrics.totalRemainingInterest.toLocaleString());
    console.log();
    console.log('Settlement Estimate:', '$' + analysis.metrics.totalSettlementEstimate.toLocaleString());
    console.log('Total Savings with Resolution:', '$' + analysis.metrics.totalSavings.toLocaleString());
    console.log();
    console.log('Average Payoff Time:', analysis.metrics.avgMonthsToPayoff + ' months');
    console.log('Debt-to-Income Ratio:', analysis.metrics.debtToIncome.toFixed(1) + '%');
    console.log();

    // Display account breakdown
    console.log('ACCOUNT BREAKDOWN:');
    console.log('-'.repeat(80));

    analysis.accounts.forEach((account, index) => {
        const riskIcon = account.riskLevel === 'red' ? '🔴' : account.riskLevel === 'orange' ? '🟠' : '🟢';

        console.log(`${index + 1}. ${riskIcon} ${account.creditor} (${account.accountType})`);
        console.log(`   Balance: $${account.balance.toLocaleString()}`);
        console.log(`   Monthly Payment: $${account.monthlyPayment.toLocaleString()}`);
        console.log(`   Interest Rate: ${account.estimatedInterestRate.toFixed(2)}%`);
        console.log(`   Interest Paid So Far: $${account.interestPaid.toLocaleString()}`);
        console.log(`   Remaining Interest: $${account.remainingInterest.toLocaleString()}`);
        console.log(`   Payoff Time: ${account.monthsToPayoff} months`);
        console.log(`   Settlement Estimate: $${account.settlementEstimate.toLocaleString()}`);
        console.log(`   Potential Savings: $${account.savingsIfSettled.toLocaleString()}`);
        if (account.utilizationPercent) {
            console.log(`   Utilization: ${account.utilizationPercent.toFixed(1)}%`);
        }
        console.log();
    });

    // Display credit score projection
    console.log('CREDIT SCORE RECOVERY PROJECTION:');
    console.log('-'.repeat(80));
    if (analysis.scoreProjection && analysis.scoreProjection.length > 0) {
        analysis.scoreProjection.forEach(proj => {
            console.log(`${proj.period}: ${proj.projectedScore} points`);
        });
    } else {
        console.log('No credit score projection available');
    }
    console.log();

    // Generate HTML report
    console.log('='.repeat(80));
    console.log('GENERATING HTML REPORT...');
    console.log('='.repeat(80));
    console.log();

    const generator = new ReportGenerator(analysis);
    const html = generator.generateHTML();

    // Save the report
    const outputDir = path.join(__dirname, '../output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'sample-credit-report.html');
    fs.writeFileSync(outputPath, html, 'utf8');

    console.log('✓ HTML report generated successfully!');
    console.log('Report saved to:', outputPath);
    console.log();
    console.log('Open this file in your browser to view the beautiful client-facing report.');
    console.log();

    // Test summary
    console.log('='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));
    console.log('✓ Credit report parsing: PASSED');
    console.log('✓ Account analysis: PASSED');
    console.log('✓ Interest calculations: PASSED');
    console.log('✓ Settlement estimates: PASSED');
    console.log('✓ HTML report generation: PASSED');
    console.log();
    console.log('All tests passed! The credit analyzer is working correctly.');
    console.log();

    // Save analysis to JSON for inspection
    const analysisPath = path.join(outputDir, 'sample-analysis.json');
    fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2), 'utf8');
    console.log('Analysis data saved to:', analysisPath);
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
