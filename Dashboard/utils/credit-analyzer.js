/**
 * Credit Report Analyzer
 * Analyzes credit reports and calculates financial metrics
 */

class CreditAnalyzer {
    constructor(creditReportData) {
        this.data = creditReportData;
        this.accounts = [];
        this.metrics = {};
    }

    /**
     * Parse credit report and extract account data
     */
    parseReport() {
        // Extract basic info
        this.clientInfo = {
            name: this.data.name || 'Client',
            creditScore: this.data.creditScore || 0,
            address: this.data.address || '',
            dateOfBirth: this.data.dateOfBirth || '',
            reportDate: this.data.reportDate || new Date().toISOString()
        };

        // Parse accounts
        this.accounts = (this.data.accounts || []).map(account => this.analyzeAccount(account));

        // Calculate overall metrics
        this.metrics = this.calculateMetrics();

        return {
            clientInfo: this.clientInfo,
            accounts: this.accounts,
            metrics: this.metrics
        };
    }

    /**
     * Analyze individual account
     */
    analyzeAccount(account) {
        const monthsSinceOpened = this.calculateMonthsSince(account.dateOpened);
        const estimatedInterestRate = this.estimateInterestRate(account);
        const interestPaid = this.calculateInterestPaid(account, monthsSinceOpened, estimatedInterestRate);
        const remainingInterest = this.calculateRemainingInterest(account, estimatedInterestRate);
        const monthsToPayoff = this.calculateMonthsToPayoff(account, estimatedInterestRate);
        const settlementEstimate = this.calculateSettlement(account.balance);
        const savingsIfSettled = account.balance - settlementEstimate;
        const utilizationPercent = this.calculateUtilization(account);
        const riskLevel = this.calculateRiskLevel(estimatedInterestRate);

        return {
            ...account,
            monthsSinceOpened,
            estimatedInterestRate,
            interestPaid,
            remainingInterest,
            monthsToPayoff,
            settlementEstimate,
            savingsIfSettled,
            utilizationPercent,
            riskLevel
        };
    }

    /**
     * Calculate months since account opened
     */
    calculateMonthsSince(dateOpened) {
        if (!dateOpened) return 0;

        const opened = new Date(dateOpened);
        const now = new Date();
        const months = (now.getFullYear() - opened.getFullYear()) * 12 +
                      (now.getMonth() - opened.getMonth());

        return Math.max(0, months);
    }

    /**
     * Estimate interest rate based on account type and data
     */
    estimateInterestRate(account) {
        // If we have actual APR, use it
        if (account.interestRate) {
            return account.interestRate;
        }

        // Estimate based on account type and payment history
        const { type, balance, highCredit, monthlyPayment, monthsSinceOpened } = account;

        // For installment loans, reverse-engineer the rate
        if (type === 'installment' || type === 'auto') {
            if (monthlyPayment && balance && monthsSinceOpened > 0) {
                // Simple estimation: total paid vs principal reduction
                const totalPaid = monthlyPayment * monthsSinceOpened;
                const principalPaid = (highCredit || balance) - balance;
                const interestPaid = totalPaid - principalPaid;

                if (interestPaid > 0 && balance > 0) {
                    const avgBalance = ((highCredit || balance) + balance) / 2;
                    const annualInterest = (interestPaid / monthsSinceOpened) * 12;
                    return (annualInterest / avgBalance) * 100;
                }
            }

            // Default estimates by type
            return type === 'auto' ? 6.5 : 12.0;
        }

        // For revolving accounts (credit cards)
        if (type === 'revolving') {
            // Estimate based on card type
            if (account.creditor) {
                const creditor = account.creditor.toLowerCase();
                if (creditor.includes('amex')) return 18.99;
                if (creditor.includes('discover')) return 20.24;
                if (creditor.includes('chase') || creditor.includes('jpmcb')) return 19.49;
                if (creditor.includes('capital one')) return 24.99;
                if (creditor.includes('citi')) return 18.74;
            }

            // Default credit card rate
            return 21.99;
        }

        // Default for other types
        return 15.0;
    }

    /**
     * Calculate interest already paid
     */
    calculateInterestPaid(account, monthsSinceOpened, interestRate) {
        if (!account.monthlyPayment || !monthsSinceOpened) return 0;

        const totalPaid = account.monthlyPayment * monthsSinceOpened;
        const principalPaid = (account.highCredit || account.balance) - account.balance;

        return Math.max(0, totalPaid - principalPaid);
    }

    /**
     * Calculate remaining interest if paying minimums
     */
    calculateRemainingInterest(account, interestRate) {
        if (!account.balance || !account.monthlyPayment) return 0;

        const monthlyRate = (interestRate / 100) / 12;
        let balance = account.balance;
        let totalInterest = 0;
        let months = 0;
        const maxMonths = 360; // Cap at 30 years

        // For revolving accounts, minimum payment is usually 2-3% of balance or interest + $25
        let payment = account.monthlyPayment;

        while (balance > 0 && months < maxMonths) {
            const interestCharge = balance * monthlyRate;

            // For revolving accounts, recalculate minimum payment
            if (account.type === 'revolving') {
                payment = Math.max(
                    interestCharge + 25, // Interest + $25
                    balance * 0.02,      // 2% of balance
                    25                    // Minimum $25
                );
            }

            totalInterest += interestCharge;
            const principalPayment = payment - interestCharge;

            if (principalPayment <= 0) {
                // Payment doesn't cover interest, will never pay off
                return Infinity;
            }

            balance -= principalPayment;
            months++;
        }

        return Math.round(totalInterest);
    }

    /**
     * Calculate months to payoff at current payment
     */
    calculateMonthsToPayoff(account, interestRate) {
        if (!account.balance || !account.monthlyPayment) return Infinity;

        const monthlyRate = (interestRate / 100) / 12;
        let balance = account.balance;
        let months = 0;
        const maxMonths = 360;

        let payment = account.monthlyPayment;

        while (balance > 0 && months < maxMonths) {
            const interestCharge = balance * monthlyRate;

            // For revolving accounts, recalculate minimum payment
            if (account.type === 'revolving') {
                payment = Math.max(
                    interestCharge + 25,
                    balance * 0.02,
                    25
                );
            }

            const principalPayment = payment - interestCharge;

            if (principalPayment <= 0) {
                return Infinity;
            }

            balance -= principalPayment;
            months++;
        }

        return months >= maxMonths ? Infinity : months;
    }

    /**
     * Calculate settlement estimate (typically 40-60% of balance)
     */
    calculateSettlement(balance, percent = 50) {
        return Math.round(balance * (percent / 100));
    }

    /**
     * Calculate utilization percentage
     */
    calculateUtilization(account) {
        if (!account.highCredit || account.highCredit === 0) return 0;
        return Math.round((account.balance / account.highCredit) * 100);
    }

    /**
     * Calculate risk level based on interest rate
     */
    calculateRiskLevel(interestRate) {
        if (interestRate >= 20) return 'red';      // High interest
        if (interestRate >= 10) return 'orange';   // Medium interest
        return 'green';                             // Low interest
    }

    /**
     * Calculate overall metrics
     */
    calculateMetrics() {
        const securedAccounts = this.accounts.filter(a => a.type === 'auto' || a.type === 'mortgage');
        const unsecuredAccounts = this.accounts.filter(a => a.type !== 'auto' && a.type !== 'mortgage');
        const activeAccounts = this.accounts.filter(a => a.balance > 0);

        const totalDebt = activeAccounts.reduce((sum, a) => sum + a.balance, 0);
        const securedDebt = securedAccounts.reduce((sum, a) => sum + a.balance, 0);
        const unsecuredDebt = unsecuredAccounts.reduce((sum, a) => sum + a.balance, 0);
        const totalMonthlyPayments = activeAccounts.reduce((sum, a) => sum + (a.monthlyPayment || 0), 0);

        const totalInterestPaid = activeAccounts.reduce((sum, a) => sum + (a.interestPaid || 0), 0);
        const totalRemainingInterest = activeAccounts.reduce((sum, a) => {
            const remaining = a.remainingInterest === Infinity ? 0 : a.remainingInterest;
            return sum + remaining;
        }, 0);

        const totalSettlementEstimate = unsecuredAccounts.reduce((sum, a) => sum + (a.settlementEstimate || 0), 0);
        const totalSavings = unsecuredDebt - totalSettlementEstimate;

        // Calculate weighted average interest rate
        const weightedRate = activeAccounts.reduce((sum, a) => {
            return sum + (a.estimatedInterestRate * a.balance);
        }, 0) / totalDebt || 0;

        // Estimate time to debt-free with current payments
        const avgMonthsToPayoff = activeAccounts.reduce((sum, a) => {
            const months = a.monthsToPayoff === Infinity ? 120 : a.monthsToPayoff;
            return sum + months;
        }, 0) / activeAccounts.length || 0;

        // Estimate time with settlement (typically 24-36 months)
        const settlementMonths = 30;

        // Estimate income based on ZIP code (default to $60,000/year)
        const estimatedAnnualIncome = this.estimateIncome(this.clientInfo.address);
        const monthlyIncome = estimatedAnnualIncome / 12;
        const debtToIncome = (totalMonthlyPayments / monthlyIncome) * 100;

        // Calculate savings metrics
        const interestSavings = totalRemainingInterest;
        const paymentSavings = totalMonthlyPayments - (totalSettlementEstimate / settlementMonths);
        const monthsSaved = avgMonthsToPayoff - settlementMonths;

        return {
            totalDebt,
            securedDebt,
            unsecuredDebt,
            totalMonthlyPayments,
            totalInterestPaid,
            totalRemainingInterest,
            totalSettlementEstimate,
            totalSavings,
            avgInterestRate: weightedRate,
            avgMonthsToPayoff: Math.round(avgMonthsToPayoff),
            settlementMonths,
            estimatedAnnualIncome,
            debtToIncome: Math.round(debtToIncome),
            interestSavings: Math.round(interestSavings),
            paymentSavings: Math.round(paymentSavings),
            monthsSaved: Math.round(monthsSaved),
            activeAccountsCount: activeAccounts.length,
            totalAccountsCount: this.accounts.length
        };
    }

    /**
     * Estimate income based on ZIP code
     * In production, use Census API or ZIP code database
     */
    estimateIncome(address) {
        // Default to median US household income
        // In production, lookup by ZIP code
        return 70000;
    }

    /**
     * Generate credit score impact projection
     */
    projectCreditScoreImpact() {
        const currentScore = this.clientInfo.creditScore;

        return {
            current: currentScore,
            months0to6: {
                score: Math.max(500, currentScore - 100),
                description: 'Initial drop as accounts become delinquent'
            },
            months6to12: {
                score: Math.max(520, currentScore - 80),
                description: 'Stabilization as settlements begin'
            },
            months12to24: {
                score: Math.max(580, currentScore - 50),
                description: 'Gradual recovery as settlements complete'
            },
            months24plus: {
                score: Math.min(750, currentScore - 20),
                description: 'Strong recovery with clean payment history on remaining accounts'
            }
        };
    }

    /**
     * Generate complete analysis
     */
    analyze() {
        const parsed = this.parseReport();
        const scoreProjection = this.projectCreditScoreImpact();

        return {
            ...parsed,
            scoreProjection,
            generatedAt: new Date().toISOString()
        };
    }
}

module.exports = CreditAnalyzer;
