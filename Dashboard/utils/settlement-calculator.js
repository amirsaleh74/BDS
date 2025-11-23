/**
 * Settlement Calculator
 * Calculates debt resolution estimates vs. traditional payoff
 */

class SettlementCalculator {
    constructor(debtData) {
        this.totalDebt = debtData.totalDebt || 0;
        this.monthlyIncome = debtData.monthlyIncome || 0;
        this.creditScore = debtData.creditScore || 650;
        this.numberOfCreditors = debtData.numberOfCreditors || 1;
        this.currentMonthlyPayment = debtData.currentMonthlyPayment || 0;
    }

    /**
     * Calculate complete comparison
     */
    calculate() {
        return {
            currentPath: this.calculateCurrentPath(),
            resolutionPath: this.calculateResolutionPath(),
            loanPath: this.calculateLoanPath(),
            comparison: this.generateComparison(),
            recommendation: this.getRecommendation(),
            calculatedAt: new Date().toISOString()
        };
    }

    /**
     * Current Path: Minimum payments
     */
    calculateCurrentPath() {
        const avgInterestRate = this.estimateAverageInterestRate();
        const monthlyPayment = this.currentMonthlyPayment || (this.totalDebt * 0.025); // 2.5% of balance

        // Calculate payoff time with minimum payments
        let balance = this.totalDebt;
        let months = 0;
        let totalInterestPaid = 0;
        const maxMonths = 360; // 30 years cap

        while (balance > 0 && months < maxMonths) {
            const interestCharge = balance * (avgInterestRate / 100 / 12);
            const principalPayment = monthlyPayment - interestCharge;

            if (principalPayment <= 0) {
                // Payment doesn't cover interest - will never pay off
                return {
                    feasible: false,
                    monthlyPayment: monthlyPayment,
                    message: 'Minimum payments will not eliminate this debt'
                };
            }

            totalInterestPaid += interestCharge;
            balance -= principalPayment;
            months++;
        }

        return {
            feasible: true,
            months: months,
            years: Math.round(months / 12 * 10) / 10,
            monthlyPayment: Math.round(monthlyPayment),
            totalPaid: Math.round(this.totalDebt + totalInterestPaid),
            interestPaid: Math.round(totalInterestPaid),
            message: `It will take ${Math.round(months / 12)} years to become debt-free`
        };
    }

    /**
     * Resolution Path: Debt settlement program
     */
    calculateResolutionPath() {
        // Typical settlement parameters
        const settlementPercent = 0.50; // 50% of balance
        const programFeePercent = 0.25; // 25% of enrolled debt
        const programMonths = this.estimateProgramLength();

        const settlementAmount = this.totalDebt * settlementPercent;
        const programFee = this.totalDebt * programFeePercent;
        const totalCost = settlementAmount + programFee;

        const monthlyPayment = Math.round(totalCost / programMonths);

        const savings = this.totalDebt - settlementAmount;

        return {
            months: programMonths,
            years: Math.round(programMonths / 12 * 10) / 10,
            monthlyPayment: monthlyPayment,
            settlementAmount: Math.round(settlementAmount),
            programFee: Math.round(programFee),
            totalPaid: Math.round(totalCost),
            savings: Math.round(savings),
            savingsPercent: Math.round((savings / this.totalDebt) * 100),
            message: `Become debt-free in ${Math.round(programMonths / 12)} years`
        };
    }

    /**
     * Loan Path: Debt consolidation loan
     */
    calculateLoanPath() {
        // Check if likely to qualify
        const qualifiesForLoan = this.canQualifyForLoan();

        if (!qualifiesForLoan.qualifies) {
            return {
                feasible: false,
                message: qualifiesForLoan.reason
            };
        }

        const loanRate = this.estimateLoanRate();
        const loanTermMonths = 60; // 5-year loan typical

        // Calculate monthly payment
        const monthlyRate = loanRate / 100 / 12;
        const monthlyPayment = this.totalDebt * (monthlyRate * Math.pow(1 + monthlyRate, loanTermMonths)) /
                               (Math.pow(1 + monthlyRate, loanTermMonths) - 1);

        const totalPaid = monthlyPayment * loanTermMonths;
        const interestPaid = totalPaid - this.totalDebt;

        return {
            feasible: true,
            months: loanTermMonths,
            years: 5,
            monthlyPayment: Math.round(monthlyPayment),
            interestRate: loanRate,
            totalPaid: Math.round(totalPaid),
            interestPaid: Math.round(interestPaid),
            message: `You may qualify for a consolidation loan`
        };
    }

    /**
     * Generate side-by-side comparison
     */
    generateComparison() {
        const current = this.calculateCurrentPath();
        const resolution = this.calculateResolutionPath();
        const loan = this.calculateLoanPath();

        return {
            timeComparison: {
                current: current.feasible ? `${current.years} years` : 'Never',
                resolution: `${resolution.years} years`,
                loan: loan.feasible ? `${loan.years} years` : 'Not available',
                winner: 'resolution'
            },
            costComparison: {
                current: current.feasible ? current.totalPaid : null,
                resolution: resolution.totalPaid,
                loan: loan.feasible ? loan.totalPaid : null,
                winner: this.totalDebt < resolution.totalPaid ? 'current' : 'resolution'
            },
            monthlyPaymentComparison: {
                current: current.feasible ? current.monthlyPayment : null,
                resolution: resolution.monthlyPayment,
                loan: loan.feasible ? loan.monthlyPayment : null,
                winner: this.findLowestPayment(current, resolution, loan)
            },
            interestSaved: {
                vsMinimumPayments: current.feasible ? (current.interestPaid - 0) : 0,
                vsLoan: loan.feasible ? (loan.interestPaid - 0) : 0
            }
        };
    }

    /**
     * Get recommendation based on profile
     */
    getRecommendation() {
        const loan = this.calculateLoanPath();
        const current = this.calculateCurrentPath();
        const resolution = this.calculateResolutionPath();

        // If credit is good and can qualify for low-rate loan
        if (this.creditScore >= 700 && loan.feasible && loan.interestRate < 10) {
            return {
                recommended: 'loan',
                reason: 'Your excellent credit qualifies you for a low-rate consolidation loan',
                action: 'Apply for debt consolidation loan'
            };
        }

        // If credit is damaged or high debt
        if (this.creditScore < 650 || this.totalDebt >= 25000) {
            return {
                recommended: 'resolution',
                reason: 'Debt resolution will save you the most money and time',
                action: 'Schedule free consultation',
                savings: resolution.savings,
                timesSaved: current.feasible ? Math.round(current.months - resolution.months) : null
            };
        }

        // If debt is manageable and credit is decent
        if (this.totalDebt < 15000 && this.creditScore >= 650) {
            return {
                recommended: 'current',
                reason: 'Your debt is manageable - consider accelerated payments',
                action: 'Create payoff plan'
            };
        }

        // Default to resolution
        return {
            recommended: 'resolution',
            reason: 'Debt resolution offers the best balance of savings and timeline',
            action: 'Schedule free consultation',
            savings: resolution.savings
        };
    }

    /**
     * Estimate average interest rate based on credit score
     */
    estimateAverageInterestRate() {
        if (this.creditScore >= 750) return 15;
        if (this.creditScore >= 700) return 18;
        if (this.creditScore >= 650) return 22;
        if (this.creditScore >= 600) return 25;
        return 28;
    }

    /**
     * Estimate program length based on debt amount
     */
    estimateProgramLength() {
        if (this.totalDebt >= 75000) return 48; // 4 years
        if (this.totalDebt >= 50000) return 42; // 3.5 years
        if (this.totalDebt >= 30000) return 36; // 3 years
        if (this.totalDebt >= 15000) return 30; // 2.5 years
        return 24; // 2 years
    }

    /**
     * Check if likely to qualify for consolidation loan
     */
    canQualifyForLoan() {
        // Credit score too low
        if (this.creditScore < 640) {
            return {
                qualifies: false,
                reason: 'Credit score too low for favorable loan terms'
            };
        }

        // DTI too high
        const estimatedMonthlyPayment = this.totalDebt * 0.025;
        const dti = this.monthlyIncome > 0 ? (estimatedMonthlyPayment / this.monthlyIncome) * 100 : 50;

        if (dti > 43) {
            return {
                qualifies: false,
                reason: 'Debt-to-income ratio too high'
            };
        }

        // Debt amount too high
        if (this.totalDebt > 100000) {
            return {
                qualifies: false,
                reason: 'Debt amount exceeds typical loan limits'
            };
        }

        return {
            qualifies: true,
            reason: 'You may qualify for a consolidation loan'
        };
    }

    /**
     * Estimate loan interest rate based on credit score
     */
    estimateLoanRate() {
        if (this.creditScore >= 750) return 7;
        if (this.creditScore >= 700) return 10;
        if (this.creditScore >= 650) return 14;
        return 18;
    }

    /**
     * Find lowest monthly payment option
     */
    findLowestPayment(current, resolution, loan) {
        const payments = [];

        if (current.feasible) payments.push({ type: 'current', amount: current.monthlyPayment });
        payments.push({ type: 'resolution', amount: resolution.monthlyPayment });
        if (loan.feasible) payments.push({ type: 'loan', amount: loan.monthlyPayment });

        payments.sort((a, b) => a.amount - b.amount);

        return payments[0].type;
    }

    /**
     * Generate client-friendly summary
     */
    generateSummary() {
        const calc = this.calculate();
        const current = calc.currentPath;
        const resolution = calc.resolutionPath;

        let summary = [];

        summary.push(`Total Debt: $${this.totalDebt.toLocaleString()}`);
        summary.push('');

        if (current.feasible) {
            summary.push('📊 CURRENT PATH (Minimum Payments):');
            summary.push(`   Time to debt-free: ${current.years} years`);
            summary.push(`   Total interest paid: $${current.interestPaid.toLocaleString()}`);
            summary.push(`   Total cost: $${current.totalPaid.toLocaleString()}`);
            summary.push('');
        }

        summary.push('✨ DEBT RESOLUTION PATH:');
        summary.push(`   Time to debt-free: ${resolution.years} years`);
        summary.push(`   Monthly payment: $${resolution.monthlyPayment.toLocaleString()}`);
        summary.push(`   Total cost: $${resolution.totalPaid.toLocaleString()}`);
        summary.push(`   💰 SAVINGS: $${resolution.savings.toLocaleString()} (${resolution.savingsPercent}%)`);

        return summary.join('\n');
    }
}

module.exports = SettlementCalculator;
