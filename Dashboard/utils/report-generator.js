/**
 * Loan vs Resolution Report Generator
 * Creates beautiful, client-friendly reports
 */

class ReportGenerator {
    constructor(analysis) {
        this.analysis = analysis;
        this.clientInfo = analysis.clientInfo;
        this.accounts = analysis.accounts;
        this.metrics = analysis.metrics;
        this.scoreProjection = analysis.scoreProjection;
    }

    /**
     * Generate complete HTML report
     */
    generateHTML() {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Personalized Debt Resolution Analysis</title>
    <style>
        ${this.getStyles()}
    </style>
</head>
<body>
    <div class="report-container">
        ${this.generateHeader()}
        ${this.generateSummaryDashboard()}
        ${this.generateAccountBreakdown()}
        ${this.generateLoanVsResolutionSection()}
        ${this.generateFinancialStory()}
        ${this.generateTimeline()}
        ${this.generateRecommendation()}
        ${this.generateFooter()}
    </div>

    <script>
        // Print functionality
        function printReport() {
            window.print();
        }

        // Download as PDF (uses browser's print to PDF)
        function downloadPDF() {
            window.print();
        }
    </script>
</body>
</html>
        `;
    }

    /**
     * CSS Styles
     */
    getStyles() {
        return `
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 20px;
            }

            .report-container {
                max-width: 900px;
                margin: 0 auto;
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                overflow: hidden;
            }

            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 40px;
                text-align: center;
            }

            .header h1 {
                font-size: 32px;
                margin-bottom: 10px;
            }

            .header p {
                font-size: 18px;
                opacity: 0.9;
            }

            .section {
                padding: 40px;
                border-bottom: 1px solid #e0e0e0;
            }

            .section:last-child {
                border-bottom: none;
            }

            .section-title {
                font-size: 24px;
                font-weight: 700;
                margin-bottom: 20px;
                color: #667eea;
            }

            /* Summary Dashboard */
            .dashboard {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }

            .metric-card {
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                padding: 20px;
                border-radius: 12px;
                text-align: center;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                transition: transform 0.3s;
            }

            .metric-card:hover {
                transform: translateY(-5px);
            }

            .metric-label {
                font-size: 13px;
                color: #666;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 8px;
            }

            .metric-value {
                font-size: 32px;
                font-weight: 700;
                color: #667eea;
            }

            .metric-subtitle {
                font-size: 12px;
                color: #999;
                margin-top: 5px;
            }

            /* Highlight Cards */
            .highlight-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-top: 30px;
            }

            .highlight-card {
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }

            .highlight-card.success {
                background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
                color: white;
            }

            .highlight-card.danger {
                background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
                color: white;
            }

            .highlight-card h3 {
                font-size: 20px;
                margin-bottom: 10px;
            }

            .highlight-card .big-number {
                font-size: 48px;
                font-weight: 700;
                margin: 10px 0;
            }

            /* Account Cards */
            .accounts-grid {
                display: grid;
                gap: 20px;
            }

            .account-card {
                border-left: 6px solid;
                padding: 20px;
                border-radius: 8px;
                background: #f9f9f9;
                transition: all 0.3s;
            }

            .account-card:hover {
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                transform: translateX(5px);
            }

            .account-card.red {
                border-left-color: #f56565;
                background: #fff5f5;
            }

            .account-card.orange {
                border-left-color: #ed8936;
                background: #fffaf0;
            }

            .account-card.green {
                border-left-color: #48bb78;
                background: #f0fff4;
            }

            .account-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }

            .account-creditor {
                font-size: 18px;
                font-weight: 700;
            }

            .account-type {
                font-size: 12px;
                padding: 4px 12px;
                border-radius: 12px;
                background: rgba(0, 0, 0, 0.1);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .account-details {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                margin: 15px 0;
            }

            .account-detail {
                display: flex;
                justify-content: space-between;
            }

            .account-detail-label {
                color: #666;
                font-size: 13px;
            }

            .account-detail-value {
                font-weight: 600;
                font-size: 14px;
            }

            .account-savings {
                margin-top: 15px;
                padding: 12px;
                background: rgba(72, 187, 120, 0.1);
                border-radius: 6px;
                text-align: center;
            }

            .account-savings strong {
                color: #48bb78;
                font-size: 18px;
            }

            /* Comparison Table */
            .comparison-table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
            }

            .comparison-table th,
            .comparison-table td {
                padding: 15px;
                text-align: left;
                border-bottom: 1px solid #e0e0e0;
            }

            .comparison-table th {
                background: #667eea;
                color: white;
                font-weight: 600;
                text-transform: uppercase;
                font-size: 13px;
                letter-spacing: 0.5px;
            }

            .comparison-table td {
                font-size: 14px;
            }

            .comparison-table .highlight {
                background: #f0fff4;
                font-weight: 700;
                color: #48bb78;
            }

            .comparison-table .warning {
                background: #fff5f5;
                color: #f56565;
            }

            /* Timeline */
            .timeline {
                position: relative;
                padding-left: 40px;
                margin: 30px 0;
            }

            .timeline::before {
                content: '';
                position: absolute;
                left: 20px;
                top: 0;
                bottom: 0;
                width: 4px;
                background: linear-gradient(to bottom, #667eea, #48bb78);
            }

            .timeline-item {
                position: relative;
                margin-bottom: 30px;
                padding-left: 20px;
            }

            .timeline-item::before {
                content: '';
                position: absolute;
                left: -26px;
                top: 5px;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: white;
                border: 4px solid #667eea;
            }

            .timeline-item.active::before {
                background: #667eea;
            }

            .timeline-item.complete::before {
                background: #48bb78;
                border-color: #48bb78;
            }

            .timeline-month {
                font-size: 14px;
                font-weight: 700;
                color: #667eea;
                margin-bottom: 5px;
            }

            .timeline-description {
                font-size: 14px;
                color: #666;
            }

            /* Progress Bar */
            .progress-bar {
                width: 100%;
                height: 40px;
                background: #e0e0e0;
                border-radius: 20px;
                overflow: hidden;
                margin: 20px 0;
                box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
            }

            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #667eea 0%, #48bb78 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 700;
                font-size: 14px;
                transition: width 1s ease;
            }

            /* Recommendation Box */
            .recommendation-box {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
            }

            .recommendation-box h2 {
                font-size: 28px;
                margin-bottom: 20px;
            }

            .recommendation-box ul {
                list-style: none;
                padding: 0;
            }

            .recommendation-box li {
                padding: 12px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                font-size: 16px;
            }

            .recommendation-box li:last-child {
                border-bottom: none;
            }

            .recommendation-box strong {
                display: inline-block;
                min-width: 200px;
            }

            /* Footer */
            .footer {
                background: #f5f7fa;
                padding: 30px;
                text-align: center;
                color: #666;
            }

            .footer-buttons {
                display: flex;
                gap: 15px;
                justify-content: center;
                margin-top: 20px;
            }

            .btn {
                padding: 12px 24px;
                border-radius: 8px;
                border: none;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
            }

            .btn-primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }

            .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }

            .btn-secondary {
                background: white;
                color: #667eea;
                border: 2px solid #667eea;
            }

            .btn-secondary:hover {
                background: #667eea;
                color: white;
            }

            /* Callout Boxes */
            .callout {
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }

            .callout.info {
                background: #ebf8ff;
                border-left: 4px solid #4299e1;
                color: #2c5282;
            }

            .callout.success {
                background: #f0fff4;
                border-left: 4px solid #48bb78;
                color: #22543d;
            }

            .callout.warning {
                background: #fffaf0;
                border-left: 4px solid #ed8936;
                color: #7c2d12;
            }

            /* Print Styles */
            @media print {
                body {
                    background: white;
                    padding: 0;
                }

                .report-container {
                    box-shadow: none;
                }

                .footer-buttons {
                    display: none;
                }

                .account-card {
                    page-break-inside: avoid;
                }
            }

            /* Responsive */
            @media (max-width: 768px) {
                .dashboard {
                    grid-template-columns: 1fr;
                }

                .highlight-grid {
                    grid-template-columns: 1fr;
                }

                .comparison-table {
                    font-size: 12px;
                }

                .comparison-table th,
                .comparison-table td {
                    padding: 10px 5px;
                }
            }
        `;
    }

    /**
     * Generate header
     */
    generateHeader() {
        return `
        <div class="header">
            <h1>📊 Your Personalized Debt Resolution Analysis</h1>
            <p>Prepared for ${this.clientInfo.name}</p>
            <p style="font-size: 14px; opacity: 0.8;">Generated on ${new Date(this.analysis.generatedAt).toLocaleDateString()}</p>
        </div>
        `;
    }

    /**
     * Generate summary dashboard
     */
    generateSummaryDashboard() {
        const m = this.metrics;

        return `
        <div class="section">
            <h2 class="section-title">💰 Summary Snapshot</h2>

            <div class="dashboard">
                <div class="metric-card">
                    <div class="metric-label">Total Debt</div>
                    <div class="metric-value">$${this.formatNumber(m.totalDebt)}</div>
                    <div class="metric-subtitle">${m.activeAccountsCount} active accounts</div>
                </div>

                <div class="metric-card">
                    <div class="metric-label">Monthly Payments</div>
                    <div class="metric-value">$${this.formatNumber(m.totalMonthlyPayments)}</div>
                    <div class="metric-subtitle">Current obligation</div>
                </div>

                <div class="metric-card">
                    <div class="metric-label">Avg Interest Rate</div>
                    <div class="metric-value">${m.avgInterestRate.toFixed(1)}%</div>
                    <div class="metric-subtitle">Weighted average</div>
                </div>

                <div class="metric-card">
                    <div class="metric-label">Credit Score</div>
                    <div class="metric-value">${this.clientInfo.creditScore}</div>
                    <div class="metric-subtitle">Current score</div>
                </div>
            </div>

            <div class="highlight-grid">
                <div class="highlight-card danger">
                    <h3>⏰ Current Path</h3>
                    <div class="big-number">${m.avgMonthsToPayoff}</div>
                    <p>Months to debt-free</p>
                    <p style="font-size: 14px; opacity: 0.9; margin-top: 10px;">
                        Paying $${this.formatNumber(m.totalRemainingInterest)} in interest
                    </p>
                </div>

                <div class="highlight-card success">
                    <h3>✅ With Resolution</h3>
                    <div class="big-number">${m.settlementMonths}</div>
                    <p>Months to debt-free</p>
                    <p style="font-size: 14px; opacity: 0.9; margin-top: 10px;">
                        Save $${this.formatNumber(m.totalSavings)} total
                    </p>
                </div>
            </div>

            <div class="callout success" style="margin-top: 30px;">
                <h3 style="margin-bottom: 10px;">💡 Key Insight</h3>
                <p style="font-size: 16px;">
                    You could save <strong>$${this.formatNumber(m.totalSavings)}</strong> and
                    become debt-free <strong>${m.monthsSaved} months sooner</strong> with a debt resolution program
                    compared to paying minimum payments.
                </p>
            </div>
        </div>
        `;
    }

    /**
     * Generate account-by-account breakdown
     */
    generateAccountBreakdown() {
        const activeAccounts = this.accounts.filter(a => a.balance > 0);

        return `
        <div class="section">
            <h2 class="section-title">📋 Account-by-Account Breakdown</h2>
            <p style="margin-bottom: 20px; color: #666;">
                Here's a detailed look at each account, color-coded by interest rate:
                <span style="color: #f56565;">● High (20%+)</span>
                <span style="color: #ed8936;">● Medium (10-20%)</span>
                <span style="color: #48bb78;">● Low (<10%)</span>
            </p>

            <div class="accounts-grid">
                ${activeAccounts.map(account => this.generateAccountCard(account)).join('')}
            </div>
        </div>
        `;
    }

    /**
     * Generate individual account card
     */
    generateAccountCard(account) {
        const monthsText = account.monthsToPayoff === Infinity
            ? 'Never (payment < interest)'
            : `${account.monthsToPayoff} months`;

        return `
        <div class="account-card ${account.riskLevel}">
            <div class="account-header">
                <div class="account-creditor">${account.creditor}</div>
                <div class="account-type">${account.type}</div>
            </div>

            <div class="account-details">
                <div class="account-detail">
                    <span class="account-detail-label">Balance:</span>
                    <span class="account-detail-value">$${this.formatNumber(account.balance)}</span>
                </div>
                <div class="account-detail">
                    <span class="account-detail-label">Monthly Payment:</span>
                    <span class="account-detail-value">$${this.formatNumber(account.monthlyPayment)}</span>
                </div>
                <div class="account-detail">
                    <span class="account-detail-label">Interest Rate:</span>
                    <span class="account-detail-value">${account.estimatedInterestRate.toFixed(2)}%</span>
                </div>
                <div class="account-detail">
                    <span class="account-detail-label">Months Open:</span>
                    <span class="account-detail-value">${account.monthsSinceOpened}</span>
                </div>
                <div class="account-detail">
                    <span class="account-detail-label">Interest Paid:</span>
                    <span class="account-detail-value">$${this.formatNumber(account.interestPaid)}</span>
                </div>
                <div class="account-detail">
                    <span class="account-detail-label">Interest Remaining:</span>
                    <span class="account-detail-value">$${this.formatNumber(account.remainingInterest === Infinity ? 0 : account.remainingInterest)}</span>
                </div>
                <div class="account-detail">
                    <span class="account-detail-label">Payoff Time:</span>
                    <span class="account-detail-value">${monthsText}</span>
                </div>
                <div class="account-detail">
                    <span class="account-detail-label">Utilization:</span>
                    <span class="account-detail-value">${account.utilizationPercent}%</span>
                </div>
            </div>

            ${account.type !== 'auto' && account.type !== 'mortgage' ? `
            <div class="account-savings">
                Settlement estimate: <strong>$${this.formatNumber(account.settlementEstimate)}</strong>
                <br>
                <span style="font-size: 14px;">You save: <strong>$${this.formatNumber(account.savingsIfSettled)}</strong></span>
            </div>
            ` : ''}
        </div>
        `;
    }

    /**
     * Generate "Why Resolution Beats a Loan" section
     */
    generateLoanVsResolutionSection() {
        return `
        <div class="section">
            <h2 class="section-title">🆚 Why Resolution Beats Taking Out a Loan</h2>

            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>Factor</th>
                        <th>Debt Consolidation Loan</th>
                        <th class="highlight">Debt Resolution</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Interest</strong></td>
                        <td class="warning">Still paying interest (8-25%)</td>
                        <td class="highlight">No more interest starting today</td>
                    </tr>
                    <tr>
                        <td><strong>Total Cost</strong></td>
                        <td class="warning">Often costs MORE than current debt</td>
                        <td class="highlight">Save 40-60% of total debt</td>
                    </tr>
                    <tr>
                        <td><strong>Time to Debt-Free</strong></td>
                        <td class="warning">5-7 years typically</td>
                        <td class="highlight">2-3 years typically</td>
                    </tr>
                    <tr>
                        <td><strong>Credit Requirements</strong></td>
                        <td class="warning">Need 720+ score, low DTI, stable income</td>
                        <td class="highlight">No credit check required</td>
                    </tr>
                    <tr>
                        <td><strong>Monthly Payment</strong></td>
                        <td class="warning">$${this.formatNumber(this.metrics.totalMonthlyPayments * 0.8)} (20% reduction at best)</td>
                        <td class="highlight">$${this.formatNumber(this.metrics.totalSettlementEstimate / this.metrics.settlementMonths)} (50%+ reduction)</td>
                    </tr>
                    <tr>
                        <td><strong>Cash Flow Impact</strong></td>
                        <td class="warning">Minimal immediate relief</td>
                        <td class="highlight">Immediate cash flow relief</td>
                    </tr>
                    <tr>
                        <td><strong>New Debt</strong></td>
                        <td class="warning">Trading old debt for new debt</td>
                        <td class="highlight">Eliminating debt permanently</td>
                    </tr>
                </tbody>
            </table>

            <div class="callout info" style="margin-top: 30px;">
                <h3 style="margin-bottom: 10px;">💡 The Truth About Debt Consolidation Loans</h3>
                <p>Most people don't qualify for debt consolidation loans when they need them most. Banks require:</p>
                <ul style="margin: 15px 0 15px 20px;">
                    <li>Credit score above 720</li>
                    <li>Debt-to-income ratio below 43%</li>
                    <li>Stable employment history</li>
                    <li>Good payment history on existing accounts</li>
                </ul>
                <p>
                    If you qualified for a good loan, you probably wouldn't need debt help in the first place.
                    Debt resolution is designed for people in real financial hardship.
                </p>
            </div>

            <div class="callout success" style="margin-top: 20px;">
                <h3 style="margin-bottom: 10px;">✅ Why Resolution Works Better</h3>
                <p><strong>Stops Interest Immediately:</strong> Your balances stop growing the moment you enroll.</p>
                <p><strong>Builds Savings:</strong> You save money in a dedicated account instead of paying creditors.</p>
                <p><strong>Negotiated Settlements:</strong> We negotiate to reduce your total debt by 40-60%.</p>
                <p><strong>Faster Freedom:</strong> Most clients are debt-free in 24-36 months, not 5-7 years.</p>
                <p><strong>Credit Recovery:</strong> Your score can fully recover within 2-3 years after completion.</p>
            </div>
        </div>
        `;
    }

    /**
     * Generate personalized financial story
     */
    generateFinancialStory() {
        const m = this.metrics;

        return `
        <div class="section">
            <h2 class="section-title">📖 Your Personalized Financial Story</h2>

            <h3 style="color: #667eea; margin: 30px 0 15px 0;">💸 The Interest Trap You're In</h3>
            <p style="font-size: 16px; line-height: 1.8;">
                Over the past ${Math.round(m.activeAccountsCount * 30 / 12)} years, you've already paid approximately
                <strong style="color: #f56565;">$${this.formatNumber(m.totalInterestPaid)}</strong> in interest charges.
                That's money that went to banks instead of your future.
            </p>

            <p style="font-size: 16px; line-height: 1.8; margin-top: 15px;">
                If you continue making minimum payments, you'll pay an additional
                <strong style="color: #f56565;">$${this.formatNumber(m.totalRemainingInterest)}</strong> in interest
                over the next ${m.avgMonthsToPayoff} months (${(m.avgMonthsToPayoff / 12).toFixed(1)} years).
            </p>

            <div class="progress-bar" style="margin: 30px 0;">
                <div class="progress-fill" style="width: ${(m.totalInterestPaid / (m.totalInterestPaid + m.totalRemainingInterest) * 100)}%;">
                    ${Math.round(m.totalInterestPaid / (m.totalInterestPaid + m.totalRemainingInterest) * 100)}% of interest already paid
                </div>
            </div>

            <h3 style="color: #48bb78; margin: 30px 0 15px 0;">✨ Your Life With Debt Resolution</h3>
            <p style="font-size: 16px; line-height: 1.8;">
                With a debt resolution program, you stop paying interest <strong>today</strong>. Instead of sending
                $${this.formatNumber(m.totalMonthlyPayments)} to creditors every month, you'd save approximately
                $${this.formatNumber(m.totalSettlementEstimate / m.settlementMonths)} per month in a dedicated account.
            </p>

            <p style="font-size: 16px; line-height: 1.8; margin-top: 15px;">
                Over 24-30 months, we negotiate with your creditors to settle your debts for approximately
                <strong style="color: #48bb78;">$${this.formatNumber(m.totalSettlementEstimate)}</strong> total
                (about 50% of your current balance).
            </p>

            <h3 style="color: #667eea; margin: 30px 0 15px 0;">🎯 Your Savings Breakdown</h3>
            <div class="dashboard">
                <div class="metric-card">
                    <div class="metric-label">Total Savings</div>
                    <div class="metric-value">$${this.formatNumber(m.totalSavings)}</div>
                    <div class="metric-subtitle">vs. current path</div>
                </div>

                <div class="metric-card">
                    <div class="metric-label">Time Saved</div>
                    <div class="metric-value">${m.monthsSaved}</div>
                    <div class="metric-subtitle">months of your life</div>
                </div>

                <div class="metric-card">
                    <div class="metric-label">Payment Reduction</div>
                    <div class="metric-value">${Math.round((1 - (m.totalSettlementEstimate / m.settlementMonths) / m.totalMonthlyPayments) * 100)}%</div>
                    <div class="metric-subtitle">lower monthly payment</div>
                </div>

                <div class="metric-card">
                    <div class="metric-label">Debt Reduction</div>
                    <div class="metric-value">${Math.round((m.totalSavings / m.totalDebt) * 100)}%</div>
                    <div class="metric-subtitle">of total debt eliminated</div>
                </div>
            </div>

            <h3 style="color: #667eea; margin: 30px 0 15px 0;">📈 Credit Score Recovery Timeline</h3>
            <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
                Your credit score will temporarily decrease but recovers faster than you think:
            </p>

            <div class="timeline">
                <div class="timeline-item active">
                    <div class="timeline-month">Months 0-6</div>
                    <div class="timeline-description">
                        <strong>Score: ~${this.scoreProjection.months0to6.score}</strong><br>
                        ${this.scoreProjection.months0to6.description}
                    </div>
                </div>

                <div class="timeline-item">
                    <div class="timeline-month">Months 6-12</div>
                    <div class="timeline-description">
                        <strong>Score: ~${this.scoreProjection.months6to12.score}</strong><br>
                        ${this.scoreProjection.months6to12.description}
                    </div>
                </div>

                <div class="timeline-item">
                    <div class="timeline-month">Months 12-24</div>
                    <div class="timeline-description">
                        <strong>Score: ~${this.scoreProjection.months12to24.score}</strong><br>
                        ${this.scoreProjection.months12to24.description}
                    </div>
                </div>

                <div class="timeline-item complete">
                    <div class="timeline-month">24+ Months</div>
                    <div class="timeline-description">
                        <strong>Score: ~${this.scoreProjection.months24plus.score}</strong><br>
                        ${this.scoreProjection.months24plus.description}
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    /**
     * Generate timeline visual
     */
    generateTimeline() {
        return `
        <div class="section">
            <h2 class="section-title">📅 Your Journey to Financial Freedom</h2>

            <div class="timeline">
                <div class="timeline-item active">
                    <div class="timeline-month">Month 0-3: Enrollment & Stabilization</div>
                    <div class="timeline-description">
                        • Enroll in program<br>
                        • Stop paying creditors<br>
                        • Begin saving in dedicated account<br>
                        • Accounts become delinquent (expected)
                    </div>
                </div>

                <div class="timeline-item">
                    <div class="timeline-month">Month 4-12: Negotiations Begin</div>
                    <div class="timeline-description">
                        • First settlements offered<br>
                        • 2-3 accounts settled<br>
                        • Savings account grows<br>
                        • Credit score stabilizes
                    </div>
                </div>

                <div class="timeline-item">
                    <div class="timeline-month">Month 12-30: Completion Phase</div>
                    <div class="timeline-description">
                        • Remaining accounts settled<br>
                        • All debts resolved<br>
                        • Program complete<br>
                        • Begin credit rebuilding
                    </div>
                </div>

                <div class="timeline-item complete">
                    <div class="timeline-month">Month 30+: Financial Reset</div>
                    <div class="timeline-description">
                        • Debt-free life begins<br>
                        • Credit score recovery accelerates<br>
                        • Build emergency fund<br>
                        • Plan for future goals
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    /**
     * Generate final recommendation
     */
    generateRecommendation() {
        const m = this.metrics;

        return `
        <div class="section">
            <div class="recommendation-box">
                <h2>🎯 Your Personalized Recommendation</h2>
                <ul>
                    <li>
                        <strong>Best Option:</strong>
                        Debt Resolution Program
                    </li>
                    <li>
                        <strong>Program Length:</strong>
                        24-36 months (estimated ${m.settlementMonths} months)
                    </li>
                    <li>
                        <strong>Monthly Savings Target:</strong>
                        $${this.formatNumber(m.totalSettlementEstimate / m.settlementMonths)}
                    </li>
                    <li>
                        <strong>Total Savings:</strong>
                        $${this.formatNumber(m.totalSavings)} compared to current path
                    </li>
                    <li>
                        <strong>Time Savings:</strong>
                        ${m.monthsSaved} months faster to debt-free
                    </li>
                    <li>
                        <strong>Credit Score Recovery:</strong>
                        Full recovery expected within 24-36 months after completion
                    </li>
                </ul>

                <div style="margin-top: 30px; padding-top: 30px; border-top: 1px solid rgba(255,255,255,0.2);">
                    <p style="font-size: 18px; line-height: 1.6;">
                        Based on your financial situation, debt resolution offers you the fastest path to
                        becoming debt-free while saving the most money. You'll have financial freedom in
                        2-3 years instead of ${(m.avgMonthsToPayoff / 12).toFixed(1)} years.
                    </p>
                </div>
            </div>
        </div>
        `;
    }

    /**
     * Generate footer
     */
    generateFooter() {
        return `
        <div class="footer">
            <p style="font-size: 14px; margin-bottom: 20px;">
                This analysis is based on your credit report dated ${new Date(this.analysis.generatedAt).toLocaleDateString()}.
                <br>
                Estimates are based on typical debt resolution outcomes and may vary based on individual circumstances.
            </p>

            <div class="footer-buttons">
                <button class="btn btn-primary" onclick="printReport()">🖨️ Print Report</button>
                <button class="btn btn-secondary" onclick="downloadPDF()">📥 Download PDF</button>
            </div>

            <p style="font-size: 12px; color: #999; margin-top: 30px;">
                © ${new Date().getFullYear()} Better Debt Solutions. All rights reserved.
                <br>
                This report is confidential and intended solely for the named recipient.
            </p>
        </div>
        `;
    }

    /**
     * Format number with commas
     */
    formatNumber(num) {
        if (num === Infinity || isNaN(num)) return '0';
        return Math.round(num).toLocaleString();
    }

    /**
     * Generate plain text summary (for email/SMS)
     */
    generateTextSummary() {
        const m = this.metrics;

        return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 YOUR DEBT RESOLUTION ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hi ${this.clientInfo.name},

Here's your personalized analysis:

📊 CURRENT SITUATION
• Total Debt: $${this.formatNumber(m.totalDebt)}
• Monthly Payments: $${this.formatNumber(m.totalMonthlyPayments)}
• Average Interest: ${m.avgInterestRate.toFixed(1)}%
• Time to Debt-Free: ${m.avgMonthsToPayoff} months

💡 WITH DEBT RESOLUTION
• Settlement Amount: $${this.formatNumber(m.totalSettlementEstimate)}
• Monthly Savings: $${this.formatNumber(m.totalSettlementEstimate / m.settlementMonths)}
• Time to Debt-Free: ${m.settlementMonths} months
• Total Savings: $${this.formatNumber(m.totalSavings)}

✅ YOUR BENEFITS
✓ Save $${this.formatNumber(m.totalSavings)} total
✓ Debt-free ${m.monthsSaved} months sooner
✓ No more interest charges
✓ Lower monthly payment
✓ Credit recovery in 24-36 months

Ready to start your journey to financial freedom?

Click here to view your full report: [LINK]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `.trim();
    }
}

module.exports = ReportGenerator;
