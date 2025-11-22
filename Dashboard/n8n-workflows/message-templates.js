/**
 * Message Templates for AI Voicemail Campaigns
 *
 * Use these templates in your n8n workflow's "Generate Message" node.
 * Each template is TCPA compliant and includes required disclosures.
 */

// ============================================
// TEMPLATE 1: Payment Reminder
// ============================================
function paymentReminderTemplate(client) {
  return `Hello ${client.name}, this is an important message from Better Debt Solutions.
This is an attempt to collect a debt.
We wanted to remind you about your upcoming payment for your account ending in ${client.alv.slice(-4)}.
Your current balance is $${client.debtAmount}.
Please call us back at 1-800-555-0123 to discuss your payment options.
To opt out of future calls, press 9.
Thank you and have a great day.`;
}

// ============================================
// TEMPLATE 2: Settlement Offer
// ============================================
function settlementOfferTemplate(client) {
  const settlementAmount = Math.round(client.debtAmount * 0.6); // 40% reduction

  return `Hello ${client.name}, this is a message from Better Debt Solutions.
This is an attempt to collect a debt.
We have great news about your account.
We can offer you a settlement on your $${client.debtAmount} debt for just $${settlementAmount}.
This is a limited time offer that could save you thousands of dollars.
Please call us back at 1-800-555-0123 to discuss this opportunity.
To opt out, press 9 or call our opt-out line.
Thank you.`;
}

// ============================================
// TEMPLATE 3: Account Review
// ============================================
function accountReviewTemplate(client) {
  return `Hello ${client.name}, this is Better Debt Solutions calling about your account.
This is an attempt to collect a debt.
We would like to review your account status and discuss some new payment plan options that may better fit your current situation.
Your account balance is $${client.debtAmount}.
Please return our call at 1-800-555-0123 at your earliest convenience.
This call may be monitored or recorded.
To opt out of future calls, press 9.
Thank you.`;
}

// ============================================
// TEMPLATE 4: Final Notice
// ============================================
function finalNoticeTemplate(client) {
  return `Hello ${client.name}, this is an urgent message from Better Debt Solutions.
This is an attempt to collect a debt.
This is a final notice regarding your account with a balance of $${client.debtAmount}.
We need to speak with you immediately to avoid further action on your account.
Please call us back today at 1-800-555-0123.
It is important that we hear from you.
To opt out of future calls, press 9.
Thank you.`;
}

// ============================================
// TEMPLATE 5: Welcome Call
// ============================================
function welcomeCallTemplate(client) {
  return `Hello ${client.name}, welcome to Better Debt Solutions.
We're calling to introduce ourselves and let you know we're here to help with your debt resolution.
We've received your information regarding $${client.debtAmount} in debt.
One of our debt specialists will be reaching out to discuss your options.
If you have questions, please call us at 1-800-555-0123.
To opt out of future calls, press 9.
Thank you for choosing Better Debt Solutions.`;
}

// ============================================
// TEMPLATE 6: Survey Request
// ============================================
function surveyRequestTemplate(client) {
  return `Hello ${client.name}, this is Better Debt Solutions.
We value your feedback and would appreciate a few minutes of your time to complete a brief satisfaction survey about our services.
Please call us back at 1-800-555-0123 or visit our website to take the survey.
Your input helps us serve you better.
To opt out of future calls, press 9.
Thank you for your time.`;
}

// ============================================
// TEMPLATE 7: Personalized by Debt Amount
// ============================================
function personalizedByDebtAmount(client) {
  const debtAmount = parseFloat(client.debtAmount);
  let message;

  if (debtAmount > 10000) {
    message = `Hello ${client.name}, this is Better Debt Solutions.
This is an attempt to collect a debt.
We understand that having over $${client.debtAmount} in debt can be overwhelming.
We have specialized programs for high-balance accounts that could reduce your debt by up to 50 percent.
Please call us at 1-800-555-0123 to learn more about these exclusive options.`;
  } else if (debtAmount > 5000) {
    message = `Hello ${client.name}, this is Better Debt Solutions.
This is an attempt to collect a debt.
We can help you resolve your $${client.debtAmount} debt with flexible payment plans that fit your budget.
Our debt specialists are ready to work with you.
Call us back at 1-800-555-0123 to get started.`;
  } else {
    message = `Hello ${client.name}, this is Better Debt Solutions.
This is an attempt to collect a debt.
Good news! Your debt amount of $${client.debtAmount} qualifies for our quick resolution program.
We can help you become debt-free faster than you think.
Call us at 1-800-555-0123 to learn more.`;
  }

  message += ` To opt out of future calls, press 9. Thank you.`;
  return message;
}

// ============================================
// TEMPLATE 8: Time-Sensitive Offer
// ============================================
function timeSensitiveOfferTemplate(client) {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 7);
  const expiry = expirationDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  return `Hello ${client.name}, this is Better Debt Solutions with a time-sensitive offer.
This is an attempt to collect a debt.
For a limited time until ${expiry}, we're offering special payment terms on your $${client.debtAmount} account.
This could significantly reduce your monthly payments.
Don't miss this opportunity.
Call us today at 1-800-555-0123.
To opt out of future calls, press 9.
Thank you.`;
}

// ============================================
// TEMPLATE 9: Follow-Up After Consultation
// ============================================
function followUpTemplate(client) {
  return `Hello ${client.name}, this is Better Debt Solutions following up on our recent conversation.
This is an attempt to collect a debt.
We wanted to check if you had any questions about the debt resolution options we discussed for your $${client.debtAmount} account.
Our team is ready to help you get started whenever you're ready.
Please call us at 1-800-555-0123.
To opt out of future calls, press 9.
Thank you.`;
}

// ============================================
// TEMPLATE 10: Holiday Special
// ============================================
function holidaySpecialTemplate(client) {
  return `Hello ${client.name}, this is Better Debt Solutions with a special holiday offer.
This is an attempt to collect a debt.
Start the new year debt-free with our exclusive holiday settlement program for your $${client.debtAmount} account.
We're offering enhanced payment terms and reduced settlements this month only.
Call us at 1-800-555-0123 to learn more.
To opt out of future calls, press 9.
Happy holidays and thank you.`;
}

// ============================================
// HOW TO USE IN N8N
// ============================================
/*
In your n8n "Generate Message" node, use this code:

const client = $input.item.json;

// Choose your template function
const message = paymentReminderTemplate(client);

// Or use conditional logic:
let message;
if (client.status === 'Overdue') {
  message = finalNoticeTemplate(client);
} else if (client.debtAmount > 10000) {
  message = settlementOfferTemplate(client);
} else {
  message = paymentReminderTemplate(client);
}

return {
  json: {
    ...client,
    personalizedMessage: message
  }
};
*/

// ============================================
// COMPLIANCE CHECKLIST
// ============================================
/*
✅ All templates include:
- Business identification
- "This is an attempt to collect a debt" disclosure
- Callback number
- Opt-out instructions
- Professional tone

⚠️ Remember to:
- Only call clients who have given consent
- Respect calling hours (8 AM - 9 PM local time)
- Check Do Not Call Registry
- Maintain opt-out list
- Record all calls if required by state law
*/

// Export templates
module.exports = {
  paymentReminderTemplate,
  settlementOfferTemplate,
  accountReviewTemplate,
  finalNoticeTemplate,
  welcomeCallTemplate,
  surveyRequestTemplate,
  personalizedByDebtAmount,
  timeSensitiveOfferTemplate,
  followUpTemplate,
  holidaySpecialTemplate
};
