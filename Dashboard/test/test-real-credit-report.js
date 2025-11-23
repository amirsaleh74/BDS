/**
 * Test with Real Credit Report Data
 * AMIRSALEH ASGARIMOVAHED - Credit Report Analysis
 */

const CreditAnalyzer = require('../utils/credit-analyzer');
const ReportGenerator = require('../utils/report-generator');
const fs = require('fs');
const path = require('path');

// Real credit report data from the user
const realCreditReport = {
    client: {
        name: 'AMIRSALEH ASGARIMOVAHED',
        creditScore: 760,
        reportDate: '2025-11-08',
        monthlyIncome: 5500, // Estimated based on employment
        ssn: '187-41-9982',
        dob: '06/28/1995',
        address: '6535 HASKELL AVE, VAN NUYS, CA 91406'
    },
    accounts: [
        {
            creditor: 'PNC BANK',
            accountType: 'Auto Loan',
            balance: 15922,
            creditLimit: 18095,
            monthlyPayment: 315,
            dateOpened: '2024-10-01',
            status: 'Open',
            paymentHistory: 'As Agreed',
            accountNumber: '3302008140109458',
            term: 72,
            originalAmount: 18095
        },
        {
            creditor: 'LIGHTSTREAM',
            accountType: 'Personal Loan',
            balance: 9371,
            creditLimit: 17000,
            monthlyPayment: 580,
            dateOpened: '2024-04-01',
            status: 'Open',
            paymentHistory: 'As Agreed',
            accountNumber: 'LS23024808',
            term: 36,
            originalAmount: 17000
        },
        {
            creditor: 'ALLY FINANCIAL',
            accountType: 'Auto Lease',
            balance: 6870,
            creditLimit: 9476,
            monthlyPayment: 359,
            dateOpened: '2025-05-01',
            status: 'Open',
            paymentHistory: 'As Agreed',
            accountNumber: '228458251884',
            term: 24,
            originalAmount: 9476
        },
        {
            creditor: 'AMEX',
            accountType: 'Credit Card',
            balance: 3657,
            creditLimit: 46000,
            monthlyPayment: 92,
            dateOpened: '2018-06-01',
            status: 'Open',
            paymentHistory: 'As Agreed',
            accountNumber: '3499925857428633'
        },
        {
            creditor: 'US BANK',
            accountType: 'Credit Card',
            balance: 3242,
            creditLimit: 8000,
            monthlyPayment: 123,
            dateOpened: '2021-10-01',
            status: 'Open',
            paymentHistory: 'As Agreed',
            accountNumber: '403784012591'
        },
        {
            creditor: 'JPMCB CARD (Chase)',
            accountType: 'Credit Card',
            balance: 2109,
            creditLimit: 14500,
            monthlyPayment: 40,
            dateOpened: '2025-05-01',
            status: 'Open',
            paymentHistory: 'As Agreed',
            accountNumber: '414720275064'
        },
        {
            creditor: 'AMEX (Account 2)',
            accountType: 'Credit Card',
            balance: 1017,
            creditLimit: 2000,
            monthlyPayment: 40,
            dateOpened: '2021-03-01',
            status: 'Open',
            paymentHistory: 'As Agreed',
            accountNumber: '3499928587648203'
        },
        {
            creditor: 'AMEX (Account 3)',
            accountType: 'Credit Card',
            balance: 1017,
            creditLimit: 2000,
            monthlyPayment: 40,
            dateOpened: '2021-03-01',
            status: 'Open',
            paymentHistory: 'As Agreed',
            accountNumber: '3499928587655953'
        },
        {
            creditor: 'DISCOVER',
            accountType: 'Credit Card',
            balance: 535,
            creditLimit: 7000,
            monthlyPayment: 35,
            dateOpened: '2023-04-01',
            status: 'Open',
            paymentHistory: 'As Agreed',
            accountNumber: '601100502409'
        },
        {
            creditor: 'GS BANK USA (Apple Card)',
            accountType: 'Credit Card',
            balance: 252,
            creditLimit: 9000,
            monthlyPayment: 148,
            dateOpened: '2019-08-01',
            status: 'Open',
            paymentHistory: 'As Agreed',
            accountNumber: '1100'
        },
        {
            creditor: 'AMEX/CBNA',
            accountType: 'Credit Card',
            balance: 25,
            creditLimit: 15000,
            monthlyPayment: 25,
            dateOpened: '2021-12-01',
            status: 'Open',
            paymentHistory: 'As Agreed',
            accountNumber: '37748152636'
        }
    ]
};

console.log('='.repeat(80));
console.log('REAL CREDIT REPORT ANALYSIS');
console.log('Client: ' + realCreditReport.client.name);
console.log('Credit Score: ' + realCreditReport.client.creditScore);
console.log('Report Date: ' + realCreditReport.client.reportDate);
console.log('='.repeat(80));
console.log();

try {
    // Analyze the report
    const analyzer = new CreditAnalyzer(realCreditReport);
    const analysis = analyzer.analyze();

    console.log('✓ Analysis Complete!');
    console.log();

    // Overall Summary
    console.log('FINANCIAL SUMMARY:');
    console.log('-'.repeat(80));
    console.log('Total Debt:                 $' + analysis.metrics.totalDebt.toLocaleString());
    console.log('  - Secured Debt:           $' + analysis.metrics.securedDebt.toLocaleString());
    console.log('  - Unsecured Debt:         $' + analysis.metrics.unsecuredDebt.toLocaleString());
    console.log();
    console.log('Monthly Payments:           $' + analysis.metrics.totalMonthlyPayments.toLocaleString());
    console.log('Average Interest Rate:      ' + analysis.metrics.avgInterestRate.toFixed(2) + '%');
    console.log('Debt-to-Income Ratio:       ' + analysis.metrics.debtToIncome.toFixed(1) + '%');
    console.log();
    console.log('Interest Already Paid:      $' + analysis.metrics.totalInterestPaid.toLocaleString());
    console.log('Remaining Interest:         $' + analysis.metrics.totalRemainingInterest.toLocaleString());
    console.log();
    console.log('Settlement Estimate:        $' + analysis.metrics.totalSettlementEstimate.toLocaleString());
    console.log('TOTAL SAVINGS POTENTIAL:    $' + analysis.metrics.totalSavings.toLocaleString());
    console.log();
    console.log('Average Payoff Time:        ' + analysis.metrics.avgMonthsToPayoff + ' months');
    console.log();

    // Account Details
    console.log('ACCOUNT BREAKDOWN:');
    console.log('-'.repeat(80));
    analysis.accounts.forEach((account, index) => {
        const riskIcon = account.riskLevel === 'red' ? '🔴' :
                        account.riskLevel === 'orange' ? '🟠' : '🟢';

        console.log();
        console.log(`${index + 1}. ${riskIcon} ${account.creditor} (${account.accountType})`);
        console.log(`   Balance:             $${account.balance.toLocaleString()}`);
        console.log(`   Monthly Payment:     $${account.monthlyPayment.toLocaleString()}`);
        console.log(`   Interest Rate:       ${account.estimatedInterestRate.toFixed(2)}%`);
        console.log(`   Interest Paid:       $${account.interestPaid.toLocaleString()}`);
        console.log(`   Remaining Interest:  $${account.remainingInterest.toLocaleString()}`);
        console.log(`   Settlement Estimate: $${account.settlementEstimate.toLocaleString()}`);
        console.log(`   Savings if Settled:  $${account.savingsIfSettled.toLocaleString()}`);
        if (account.utilizationPercent) {
            console.log(`   Utilization:         ${account.utilizationPercent.toFixed(1)}%`);
        }
    });

    console.log();
    console.log('='.repeat(80));
    console.log('ANALYSIS INSIGHTS:');
    console.log('='.repeat(80));
    console.log();

    // Calculate some insights
    const highInterestAccounts = analysis.accounts.filter(a => a.riskLevel === 'red').length;
    const mediumInterestAccounts = analysis.accounts.filter(a => a.riskLevel === 'orange').length;
    const lowInterestAccounts = analysis.accounts.filter(a => a.riskLevel === 'green').length;

    console.log(`High Interest Accounts (20%+):    ${highInterestAccounts}`);
    console.log(`Medium Interest Accounts (10-20%): ${mediumInterestAccounts}`);
    console.log(`Low Interest Accounts (<10%):      ${lowInterestAccounts}`);
    console.log();

    // Credit health assessment
    console.log('CREDIT HEALTH ASSESSMENT:');
    console.log('-'.repeat(80));
    console.log('Credit Score:               ' + realCreditReport.client.creditScore + ' (GOOD)');
    console.log('Revolving Utilization:      8% (EXCELLENT - Under 30%)');
    console.log('Payment History:            All accounts current (EXCELLENT)');
    console.log('Account Mix:                Auto loans + revolving credit (GOOD)');
    console.log('Recent Inquiries:           5 in last 12 months (ACCEPTABLE)');
    console.log();

    console.log('RECOMMENDATION:');
    console.log('-'.repeat(80));
    console.log('With a 760 credit score and excellent payment history, you have options:');
    console.log();
    console.log('Option 1: Debt Consolidation Loan');
    console.log('  ✓ You qualify for low rates (6-10%)');
    console.log('  ✓ Could consolidate unsecured debt ($' + analysis.metrics.unsecuredDebt.toLocaleString() + ')');
    console.log('  ✓ Simplify to one payment');
    console.log('  ✗ Still paying interest for years');
    console.log('  ✗ New debt on credit report');
    console.log();
    console.log('Option 2: Debt Settlement/Resolution');
    console.log('  ✓ Save $' + analysis.metrics.totalSavings.toLocaleString() + ' in total');
    console.log('  ✓ Stop interest accumulation immediately');
    console.log('  ✓ Free up cash flow');
    console.log('  ✗ Credit score impact (temporary)');
    console.log('  ✗ Requires accounts to be delinquent');
    console.log();
    console.log('Option 3: Avalanche Method (Pay highest interest first)');
    console.log('  ✓ Maintain excellent credit');
    console.log('  ✓ Save on interest vs. minimum payments');
    console.log('  ✗ Takes ' + Math.round(analysis.metrics.avgMonthsToPayoff) + ' months to payoff');
    console.log('  ✗ Requires strict budgeting');
    console.log();

    console.log('BEST STRATEGY FOR YOUR SITUATION:');
    console.log('Given your excellent credit (760) and manageable debt-to-income (32.7%),');
    console.log('you should consider a DEBT CONSOLIDATION LOAN to:');
    console.log('  1. Lock in a lower interest rate (6-10% vs current avg ' + analysis.metrics.avgInterestRate.toFixed(2) + '%)');
    console.log('  2. Simplify payments to one monthly bill');
    console.log('  3. Maintain your excellent credit score');
    console.log('  4. Pay off debt faster with lower interest');
    console.log();
    console.log('Settlement is typically for those with:');
    console.log('  - Credit score < 650');
    console.log('  - Already behind on payments');
    console.log('  - High debt-to-income (>50%)');
    console.log('  - Unable to get approved for consolidation loans');
    console.log();

    // Generate HTML Report
    console.log('='.repeat(80));
    console.log('GENERATING HTML REPORT...');
    console.log('='.repeat(80));
    console.log();

    const generator = new ReportGenerator(analysis);
    const html = generator.generateHTML();

    const outputDir = path.join(__dirname, '../output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'real-credit-report.html');
    fs.writeFileSync(outputPath, html, 'utf8');

    console.log('✓ HTML report saved to:', outputPath);
    console.log();

    const analysisPath = path.join(outputDir, 'real-analysis.json');
    fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2), 'utf8');

    console.log('✓ Analysis JSON saved to:', analysisPath);
    console.log();
    console.log('='.repeat(80));
    console.log('TEST COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));

} catch (error) {
    console.error('ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
}
