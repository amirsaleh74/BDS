/**
 * Lead Scoring Algorithm
 * Calculates qualification score and close probability based on multiple factors
 */

class LeadScoring {
    constructor(leadData) {
        this.lead = leadData;
    }

    /**
     * Calculate overall qualification score (0-100)
     */
    calculateQualificationScore() {
        const debtScore = this.calculateDebtScore();
        const abilityToPayScore = this.calculateAbilityToPayScore();
        const creditProfileScore = this.calculateCreditProfileScore();
        const urgencyScore = this.calculateUrgencyScore();

        const totalScore = debtScore + abilityToPayScore + creditProfileScore + urgencyScore;

        return {
            totalScore: Math.round(totalScore),
            breakdown: {
                debtScore: debtScore,
                abilityToPayScore: abilityToPayScore,
                creditProfileScore: creditProfileScore,
                urgencyScore: urgencyScore
            },
            grade: this.getScoreGrade(totalScore),
            recommendation: this.getRecommendation(totalScore)
        };
    }

    /**
     * Debt Score (0-40 points)
     * Higher debt = better candidate for resolution
     */
    calculateDebtScore() {
        const debt = this.lead.totalDebt || 0;

        if (debt >= 100000) return 40;
        if (debt >= 50000) return 35;
        if (debt >= 25000) return 25;
        if (debt >= 10000) return 10;
        return 5; // Under $10K - too small
    }

    /**
     * Ability to Pay Score (0-30 points)
     * Based on debt-to-income ratio
     */
    calculateAbilityToPayScore() {
        const debt = this.lead.totalDebt || 0;
        const income = this.lead.monthlyIncome || 0;

        if (income === 0) return 10; // Unknown income - give benefit of doubt

        const monthlyPayment = this.estimateMonthlyPayment(debt);
        const dti = (monthlyPayment / income) * 100;

        // Sweet spot: can afford program but stressed by current debt
        if (dti >= 20 && dti <= 40) return 30; // Ideal
        if (dti >= 15 && dti < 20) return 25;
        if (dti >= 10 && dti < 15) return 20;
        if (dti >= 40 && dti <= 60) return 25; // Stressed but manageable
        if (dti > 60) return 15; // May struggle with program
        return 10; // Very low DTI - might not need resolution
    }

    /**
     * Credit Profile Score (0-20 points)
     * Lower credit score = better candidate for settlement
     */
    calculateCreditProfileScore() {
        const creditScore = this.lead.creditScore;

        if (!creditScore) return 10; // Unknown - neutral

        if (creditScore < 580) return 20; // Poor - ideal for resolution
        if (creditScore >= 580 && creditScore < 620) return 18;
        if (creditScore >= 620 && creditScore < 650) return 15;
        if (creditScore >= 650 && creditScore < 700) return 10;
        if (creditScore >= 700 && creditScore < 750) return 5; // Good credit - consider consolidation
        return 3; // Excellent credit - probably wants consolidation loan
    }

    /**
     * Urgency Score (0-10 points)
     * Based on keywords, tags, and status
     */
    calculateUrgencyScore() {
        let score = 0;

        const urgentKeywords = ['lawsuit', 'garnishment', 'collection', 'behind', 'late', 'default', 'sue', 'court'];
        const hardshipKeywords = this.lead.hardshipKeywords || [];
        const tags = this.lead.tags || [];
        const allText = [...hardshipKeywords, ...tags].join(' ').toLowerCase();

        // Check for urgent keywords
        const hasUrgentKeyword = urgentKeywords.some(keyword => allText.includes(keyword));
        if (hasUrgentKeyword) score += 10;

        // Check for hardship indicators
        if (hardshipKeywords.length > 0) score += 5;

        // Check tags
        if (tags.includes('urgent') || tags.includes('hot')) score += 5;

        return Math.min(score, 10); // Cap at 10
    }

    /**
     * Calculate Close Probability (0-100%)
     * Based on qualification score + engagement
     */
    calculateCloseProbability() {
        const qualScore = this.calculateQualificationScore().totalScore;
        const heatScore = this.lead.heatScore || 0;

        // Qualification is 60% of probability
        const qualWeight = qualScore * 0.6;

        // Engagement is 40% of probability
        const engagementWeight = heatScore * 0.4;

        const probability = qualWeight + engagementWeight;

        return {
            probability: Math.round(probability),
            tier: this.getProbabilityTier(probability),
            factors: {
                qualification: Math.round(qualWeight),
                engagement: Math.round(engagementWeight)
            }
        };
    }

    /**
     * Estimate monthly payment for debt resolution program
     */
    estimateMonthlyPayment(totalDebt) {
        // Typical program: 24-48 months, 50-60% settlement
        const settlementAmount = totalDebt * 0.55; // 55% average
        const programMonths = 36; // 3 years average
        const monthlyDeposit = settlementAmount / programMonths;
        const programFee = totalDebt * 0.25; // 25% fee
        const totalMonthly = monthlyDeposit + (programFee / programMonths);

        return totalMonthly;
    }

    /**
     * Get score grade (A-F)
     */
    getScoreGrade(score) {
        if (score >= 90) return 'A+';
        if (score >= 80) return 'A';
        if (score >= 70) return 'B';
        if (score >= 60) return 'C';
        if (score >= 50) return 'D';
        return 'F';
    }

    /**
     * Get probability tier
     */
    getProbabilityTier(probability) {
        if (probability >= 75) return 'HOT';
        if (probability >= 50) return 'WARM';
        if (probability >= 25) return 'COOL';
        return 'COLD';
    }

    /**
     * Get recommendation based on score
     */
    getRecommendation(score) {
        if (score >= 80) {
            return {
                action: 'PRIORITY',
                priority: 1,
                message: 'Excellent candidate - call immediately',
                suggestedApproach: 'Direct close approach - this lead is ready',
                estimatedCloseTime: '1-3 calls'
            };
        }

        if (score >= 65) {
            return {
                action: 'HIGH_PRIORITY',
                priority: 2,
                message: 'Strong candidate - contact within 24 hours',
                suggestedApproach: 'Educational approach - build value first',
                estimatedCloseTime: '3-5 calls'
            };
        }

        if (score >= 50) {
            return {
                action: 'NURTURE',
                priority: 3,
                message: 'Good candidate - add to nurture sequence',
                suggestedApproach: 'Multi-touch campaign - email + SMS + calls',
                estimatedCloseTime: '5-10 calls'
            };
        }

        if (score >= 35) {
            return {
                action: 'LOW_PRIORITY',
                priority: 4,
                message: 'Marginal candidate - automated follow-up only',
                suggestedApproach: 'Email drip campaign - wait for engagement',
                estimatedCloseTime: '10+ calls'
            };
        }

        return {
            action: 'DISQUALIFY',
            priority: 5,
            message: 'Poor fit - consider other solutions (consolidation loan)',
            suggestedApproach: 'Refer to loan partner or archive',
            estimatedCloseTime: 'Unlikely to close'
        };
    }

    /**
     * Generate pitch angle based on lead profile
     */
    generatePitchAngle() {
        const debt = this.lead.totalDebt || 0;
        const creditScore = this.lead.creditScore || 650;
        const income = this.lead.monthlyIncome || 0;

        // Determine primary angle
        let primaryAngle = '';
        let secondaryPoints = [];

        // High debt angle
        if (debt >= 50000) {
            primaryAngle = 'massive_debt';
            secondaryPoints = [
                `You're carrying $${this.formatMoney(debt)} in debt`,
                `At minimum payments, you'll pay $${this.formatMoney(debt * 0.65)} in interest`,
                `Resolution can save you $${this.formatMoney(debt * 0.45)} or more`
            ];
        }

        // Low credit angle
        else if (creditScore < 620) {
            primaryAngle = 'credit_damaged';
            secondaryPoints = [
                `Your credit score (${creditScore}) is already impacted`,
                `Traditional loans are difficult to qualify for`,
                `Resolution can rebuild credit faster than minimum payments`
            ];
        }

        // High DTI angle
        else if (income > 0 && (debt / (income * 12)) > 0.5) {
            primaryAngle = 'payment_burden';
            secondaryPoints = [
                `Your monthly debt payments are unsustainable`,
                `Freeing up cash flow is critical`,
                `Resolution reduces monthly commitment by 40-60%`
            ];
        }

        // Default angle
        else {
            primaryAngle = 'freedom_focused';
            secondaryPoints = [
                `Become debt-free in 24-48 months`,
                `Save thousands in interest`,
                `Stop the cycle of minimum payments`
            ];
        }

        return {
            primaryAngle,
            secondaryPoints,
            openingLine: this.getOpeningLine(primaryAngle),
            objectionHandlers: this.getCommonObjections(primaryAngle)
        };
    }

    /**
     * Get opening line based on angle
     */
    getOpeningLine(angle) {
        const openings = {
            massive_debt: `I see you're dealing with over $${this.formatMoney(this.lead.totalDebt || 0)} in debt. The good news is, you have options most people don't know about.`,
            credit_damaged: `With your credit score already impacted, you're in a unique position to take advantage of settlement programs that can actually rebuild your score faster.`,
            payment_burden: `I can show you how to cut your monthly debt payments by more than half while becoming debt-free years sooner.`,
            freedom_focused: `What if I told you that you could be completely debt-free in 2-3 years, saving thousands in interest?`
        };

        return openings[angle] || openings.freedom_focused;
    }

    /**
     * Get common objections for angle
     */
    getCommonObjections(angle) {
        return {
            credit_impact: `Your credit is already affected by the debt load. Resolution can actually help you recover faster because you're eliminating debt rather than perpetuating it.`,
            cost: `The program pays for itself through the savings. You'll save more in reduced debt than you'll ever pay in fees.`,
            time: `Minimum payments will take 15-20 years. Resolution gets you free in 2-4 years. What's more valuable to you - your credit score or 15 years of your life?`,
            spouse: `This is exactly why I want to get you both on a call together. The numbers tell a compelling story, and I want to make sure you're both comfortable with the decision.`
        };
    }

    /**
     * Format money
     */
    formatMoney(amount) {
        return Math.round(amount).toLocaleString();
    }

    /**
     * Complete analysis
     */
    analyze() {
        return {
            qualification: this.calculateQualificationScore(),
            closeProbability: this.calculateCloseProbability(),
            pitchAngle: this.generatePitchAngle(),
            estimatedMonthlyPayment: Math.round(this.estimateMonthlyPayment(this.lead.totalDebt || 0)),
            analyzedAt: new Date().toISOString()
        };
    }
}

module.exports = LeadScoring;
