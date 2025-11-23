/**
 * AI Email Writer
 * Generates personalized email content for leads based on their profile
 * Uses templates + smart variable substitution (can be upgraded to use real AI API later)
 */

class AIEmailWriter {
    constructor(database) {
        this.db = database;
    }

    /**
     * Generate personalized email
     * @param {Object} lead - Lead data
     * @param {String} emailType - Type of email (welcome, follow_up, quote, objection_handler, etc.)
     * @param {Object} options - Additional options
     * @returns {Object} Email content (subject, body, preview)
     */
    generateEmail(lead, emailType = 'welcome', options = {}) {
        // Get lead scoring data for personalization
        const LeadScoring = require('./lead-scoring');
        const scorer = new LeadScoring(lead);
        const analysis = scorer.analyze();

        // Get email template
        const template = this.getTemplate(emailType, analysis.pitchAngle.primaryAngle);

        // Prepare variables for substitution
        const variables = this.prepareVariables(lead, analysis, options);

        // Generate email
        const email = {
            subject: this.substituteVariables(template.subject, variables),
            preview: this.substituteVariables(template.preview, variables),
            body: this.substituteVariables(template.body, variables),
            emailType: emailType,
            pitchAngle: analysis.pitchAngle.primaryAngle,
            generatedAt: new Date().toISOString()
        };

        return email;
    }

    /**
     * Prepare variables for email substitution
     */
    prepareVariables(lead, analysis, options) {
        const firstName = lead.firstName || 'there';
        const lastName = lead.lastName || '';
        const totalDebt = lead.totalDebt || 0;
        const monthlyIncome = lead.monthlyIncome || 0;
        const creditScore = lead.creditScore || 650;

        // Calculate potential savings (simplified)
        const estimatedSavings = Math.round(totalDebt * 0.4); // 40% average savings
        const estimatedMonthlyPayment = analysis.estimatedMonthlyPayment || Math.round(totalDebt * 0.03);
        const currentMonthlyPayment = lead.currentMonthlyPayment || Math.round(totalDebt * 0.025);
        const monthlySavings = Math.max(0, currentMonthlyPayment - estimatedMonthlyPayment);

        // Time to freedom (estimated)
        const estimatedMonths = analysis.estimatedTimeframe || 36;
        const estimatedYears = Math.round(estimatedMonths / 12 * 10) / 10;

        // Get talking points based on pitch angle
        const talkingPoints = analysis.pitchAngle.talkingPoints || [];

        // Qualification info
        const qualScore = analysis.qualification.totalScore || 0;
        const qualGrade = analysis.qualification.grade || 'C';

        return {
            firstName,
            lastName,
            fullName: `${firstName} ${lastName}`.trim(),
            totalDebt: this.formatCurrency(totalDebt),
            totalDebtNumber: totalDebt,
            estimatedSavings: this.formatCurrency(estimatedSavings),
            estimatedSavingsNumber: estimatedSavings,
            estimatedMonthlyPayment: this.formatCurrency(estimatedMonthlyPayment),
            currentMonthlyPayment: this.formatCurrency(currentMonthlyPayment),
            monthlySavings: this.formatCurrency(monthlySavings),
            estimatedMonths,
            estimatedYears,
            creditScore,
            monthlyIncome: this.formatCurrency(monthlyIncome),
            qualScore,
            qualGrade,
            talkingPoint1: talkingPoints[0] || 'significantly reduce your debt',
            talkingPoint2: talkingPoints[1] || 'get back on track financially',
            talkingPoint3: talkingPoints[2] || 'achieve financial freedom',
            companyName: options.companyName || 'Better Debt Solutions',
            agentName: options.agentName || 'Our Team',
            agentPhone: options.agentPhone || '(800) 555-DEBT',
            agentEmail: options.agentEmail || 'support@betterdebtsolutions.com',
            calculatorUrl: options.calculatorUrl || 'http://localhost:3000/calculator',
            scheduleUrl: options.scheduleUrl || 'http://localhost:3000/schedule-call',
            unsubscribeUrl: options.unsubscribeUrl || 'http://localhost:3000/unsubscribe'
        };
    }

    /**
     * Get email template based on type and pitch angle
     */
    getTemplate(emailType, pitchAngle) {
        const templates = this.getEmailTemplates();

        // Try to get specific template for pitch angle
        const templateKey = `${emailType}_${pitchAngle}`;
        if (templates[templateKey]) {
            return templates[templateKey];
        }

        // Fall back to generic template for email type
        if (templates[emailType]) {
            return templates[emailType];
        }

        // Fall back to default welcome
        return templates.welcome;
    }

    /**
     * Substitute variables in template
     */
    substituteVariables(template, variables) {
        let result = template;

        Object.keys(variables).forEach(key => {
            const placeholder = new RegExp(`{{${key}}}`, 'g');
            result = result.replace(placeholder, variables[key]);
        });

        return result;
    }

    /**
     * Format currency
     */
    formatCurrency(amount) {
        return '$' + Math.round(amount).toLocaleString();
    }

    /**
     * Email templates library
     */
    getEmailTemplates() {
        return {
            // Welcome Email - Massive Debt Angle
            welcome_massive_debt: {
                subject: "{{firstName}}, here's how to eliminate {{totalDebt}} in debt",
                preview: "You could save {{estimatedSavings}} and become debt-free in just {{estimatedYears}} years",
                body: `
<h2>Hi {{firstName}},</h2>

<p>Thank you for reaching out to {{companyName}}. I'm reaching out because I believe we can help you with your <strong>{{totalDebt}}</strong> in debt.</p>

<p><strong>Here's the reality:</strong> If you continue making minimum payments, you could be paying on this debt for 20+ years and pay double or triple the original amount in interest.</p>

<p><strong>The good news?</strong> You could potentially:</p>

<ul>
    <li>Reduce your debt by <strong>{{estimatedSavings}}</strong></li>
    <li>Lower your monthly payment from {{currentMonthlyPayment}} to {{estimatedMonthlyPayment}}</li>
    <li>Become debt-free in approximately {{estimatedYears}} years (not decades)</li>
    <li>Stop interest from accumulating today</li>
</ul>

<p>{{talkingPoint1}} - and we've helped thousands of people just like you do exactly that.</p>

<p><strong>What's the next step?</strong></p>

<p>I'd like to schedule a free, no-obligation consultation to show you exactly how much you could save and create a personalized debt resolution plan for your situation.</p>

<p><a href="{{scheduleUrl}}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Schedule Free Consultation</a></p>

<p>Or use our calculator to see your potential savings right now:</p>

<p><a href="{{calculatorUrl}}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Calculate My Savings</a></p>

<p>Have questions? Just reply to this email or call me directly at {{agentPhone}}.</p>

<p>Looking forward to helping you achieve financial freedom,</p>

<p><strong>{{agentName}}</strong><br>
Debt Resolution Specialist<br>
{{companyName}}<br>
{{agentPhone}}</p>
                `.trim()
            },

            // Welcome Email - Credit Damaged Angle
            welcome_credit_damaged: {
                subject: "{{firstName}}, let's rebuild your financial future",
                preview: "Your credit doesn't have to hold you back. Here's how to fix it.",
                body: `
<h2>Hi {{firstName}},</h2>

<p>I understand that dealing with debt can feel overwhelming, especially when it's affecting your credit score. But here's the truth: <strong>your current situation is not permanent</strong>.</p>

<p>With a credit score around {{creditScore}} and {{totalDebt}} in debt, you're actually in a great position to turn things around.</p>

<p><strong>Here's what we can do:</strong></p>

<ul>
    <li>Help you resolve your debt for potentially {{estimatedSavings}} less than you owe</li>
    <li>Create a realistic payment plan you can actually afford (around {{estimatedMonthlyPayment}}/month)</li>
    <li>Give you a clear timeline to becoming debt-free ({{estimatedYears}} years)</li>
    <li>Set you up for credit score recovery once debts are resolved</li>
</ul>

<p>{{talkingPoint1}} - because you deserve a fresh start.</p>

<p><strong>Let's create your personalized debt resolution plan:</strong></p>

<p><a href="{{scheduleUrl}}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Get Your Free Consultation</a></p>

<p>Or see how much you could save with our calculator:</p>

<p><a href="{{calculatorUrl}}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Calculate Savings</a></p>

<p>Questions? I'm here to help. Call {{agentPhone}} or just reply to this email.</p>

<p>To your financial recovery,</p>

<p><strong>{{agentName}}</strong><br>
Debt Resolution Specialist<br>
{{companyName}}</p>
                `.trim()
            },

            // Generic Welcome Email
            welcome: {
                subject: "Welcome, {{firstName}} - Let's tackle your debt together",
                preview: "See how you could save {{estimatedSavings}} and become debt-free",
                body: `
<h2>Welcome, {{firstName}}!</h2>

<p>Thank you for reaching out to {{companyName}}. We're here to help you take control of your financial future.</p>

<p><strong>Based on your situation, you could potentially:</strong></p>

<ul>
    <li>Save up to {{estimatedSavings}} on your total debt</li>
    <li>Reduce monthly payments to around {{estimatedMonthlyPayment}}</li>
    <li>Become completely debt-free in {{estimatedYears}} years</li>
</ul>

<p><strong>Next Steps:</strong></p>

<p>1. <a href="{{calculatorUrl}}">Calculate Your Exact Savings</a><br>
2. <a href="{{scheduleUrl}}">Schedule Your Free Consultation</a><br>
3. Get Your Custom Debt Resolution Plan</p>

<p>Have questions? Reply to this email or call {{agentPhone}}.</p>

<p>Best regards,</p>

<p><strong>{{agentName}}</strong><br>
{{companyName}}</p>
                `.trim()
            },

            // Follow-up Email (after first contact)
            follow_up: {
                subject: "{{firstName}}, following up on your debt resolution options",
                preview: "I wanted to make sure you got the information you needed",
                body: `
<h2>Hi {{firstName}},</h2>

<p>I wanted to follow up on our previous conversation about your {{totalDebt}} in debt.</p>

<p>I know making this decision isn't easy, so I wanted to make sure you had all the information you needed:</p>

<p><strong>Quick Recap - You Could:</strong></p>
<ul>
    <li>Save approximately {{estimatedSavings}}</li>
    <li>Pay around {{estimatedMonthlyPayment}}/month (instead of {{currentMonthlyPayment}})</li>
    <li>Be debt-free in {{estimatedYears}} years</li>
</ul>

<p><strong>Common Questions I Get:</strong></p>

<p><em>"How does this affect my credit?"</em><br>
Your credit may be impacted initially, but once debts are resolved, you can start rebuilding - and you'll be debt-free to do it.</p>

<p><em>"Is this really legitimate?"</em><br>
Absolutely. Debt settlement is a proven strategy that's helped millions of Americans. We've been doing this for over a decade.</p>

<p><em>"What if I can't afford the monthly payment?"</em><br>
We work with your budget. If {{estimatedMonthlyPayment}} is too much, we can adjust the plan to fit what you can realistically afford.</p>

<p>Ready to move forward? <a href="{{scheduleUrl}}">Schedule a call with me</a> and let's create your personalized plan.</p>

<p>Or if you have questions, just reply to this email.</p>

<p>Best,</p>

<p><strong>{{agentName}}</strong><br>
{{agentPhone}}</p>
                `.trim()
            },

            // Quote/Proposal Email
            quote: {
                subject: "Your personalized debt resolution proposal - {{estimatedSavings}} in savings",
                preview: "Here's exactly how we can help you become debt-free",
                body: `
<h2>Hi {{firstName}},</h2>

<p>As promised, here is your personalized debt resolution proposal:</p>

<p><strong>Your Current Situation:</strong></p>
<ul>
    <li>Total Debt: {{totalDebt}}</li>
    <li>Current Monthly Payment: {{currentMonthlyPayment}}</li>
    <li>Credit Score: {{creditScore}}</li>
</ul>

<p><strong>Our Proposed Solution:</strong></p>
<ul>
    <li><strong>Settlement Amount: {{estimatedSavings}} in savings</strong></li>
    <li>New Monthly Payment: {{estimatedMonthlyPayment}}</li>
    <li>Program Duration: {{estimatedMonths}} months ({{estimatedYears}} years)</li>
    <li>Estimated Completion: [calculated date]</li>
</ul>

<p><strong>What This Means For You:</strong></p>
<ul>
    <li>Save {{monthlySavings}} per month</li>
    <li>Eliminate {{estimatedSavings}} of debt</li>
    <li>Become debt-free in just {{estimatedYears}} years</li>
    <li>Start rebuilding your financial future</li>
</ul>

<p><strong>Ready to Get Started?</strong></p>

<p><a href="{{scheduleUrl}}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Accept This Proposal</a></p>

<p>Have questions about the proposal? Let's discuss it:</p>

<p>Call me: {{agentPhone}}<br>
Email me: {{agentEmail}}</p>

<p>This proposal is customized specifically for your situation and is valid for 7 days.</p>

<p>Looking forward to helping you,</p>

<p><strong>{{agentName}}</strong><br>
Senior Debt Resolution Specialist<br>
{{companyName}}</p>
                `.trim()
            },

            // Objection Handler - "Too Expensive"
            objection_too_expensive: {
                subject: "{{firstName}}, let's find a payment plan that works for you",
                preview: "We can adjust the payment to fit your budget",
                body: `
<h2>Hi {{firstName}},</h2>

<p>I understand that {{estimatedMonthlyPayment}} per month might feel like a stretch right now. The good news is, <strong>we can work with your budget</strong>.</p>

<p><strong>Here's what I can do:</strong></p>

<p>1. <strong>Adjust the payment amount</strong> - We can extend the program length to lower your monthly payment<br>
2. <strong>Start smaller</strong> - Begin with a lower payment and increase it as your situation improves<br>
3. <strong>Flexible scheduling</strong> - Choose payment dates that work with your income schedule</p>

<p><strong>Let's put this in perspective:</strong></p>

<p>Right now, you're paying approximately {{currentMonthlyPayment}}/month and your debt isn't going down much because of interest.</p>

<p>For potentially less money per month, you could:</p>
<ul>
    <li>Stop interest accumulation immediately</li>
    <li>Reduce your total debt by {{estimatedSavings}}</li>
    <li>Have a clear end date to being debt-free</li>
</ul>

<p><strong>What monthly payment would work for your budget?</strong></p>

<p><a href="{{scheduleUrl}}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Let's Find a Number That Works</a></p>

<p>Or call me directly: {{agentPhone}}</p>

<p>We'll make this work for you.</p>

<p>{{agentName}}</p>
                `.trim()
            },

            // Objection Handler - "I need to think about it"
            objection_need_to_think: {
                subject: "{{firstName}}, I completely understand - here's what to consider",
                preview: "Take your time, but here are the facts to help you decide",
                body: `
<h2>Hi {{firstName}},</h2>

<p>I completely understand that you need time to think about this decision. It's a big step, and you should feel confident about it.</p>

<p><strong>While you're thinking, here are the key facts to consider:</strong></p>

<p><strong>If you do nothing:</strong></p>
<ul>
    <li>Your {{totalDebt}} debt continues to accumulate interest</li>
    <li>You could pay 2-3x the original amount over 20+ years</li>
    <li>Your credit continues to be affected</li>
    <li>The stress and burden continue</li>
</ul>

<p><strong>If you move forward:</strong></p>
<ul>
    <li>Save approximately {{estimatedSavings}}</li>
    <li>Become debt-free in just {{estimatedYears}} years</li>
    <li>Pay less per month ({{estimatedMonthlyPayment}} vs {{currentMonthlyPayment}})</li>
    <li>Start rebuilding your financial future today</li>
</ul>

<p><strong>Questions you should be asking yourself:</strong></p>

<p>1. Can I realistically pay off this debt with minimum payments?<br>
2. How much will I pay in interest if I keep going as-is?<br>
3. What will my life look like debt-free in {{estimatedYears}} years?<br>
4. What's the worst that happens if I don't do anything?</p>

<p><strong>I'm here when you're ready.</strong></p>

<p>Take the time you need, but know that every month you wait is another month of interest piling up.</p>

<p>When you're ready to move forward (or if you have any questions), just reply to this email or call me at {{agentPhone}}.</p>

<p>Rooting for you,</p>

<p><strong>{{agentName}}</strong><br>
{{companyName}}</p>
                `.trim()
            }
        };
    }

    /**
     * Get available email types
     */
    getAvailableEmailTypes() {
        return [
            { value: 'welcome', label: 'Welcome Email', description: 'First email to new leads' },
            { value: 'follow_up', label: 'Follow-up Email', description: 'Following up after initial contact' },
            { value: 'quote', label: 'Quote/Proposal', description: 'Sending the debt resolution proposal' },
            { value: 'objection_too_expensive', label: 'Objection: Too Expensive', description: 'When lead says they can\'t afford it' },
            { value: 'objection_need_to_think', label: 'Objection: Need to Think', description: 'When lead needs time to decide' }
        ];
    }
}

module.exports = AIEmailWriter;
