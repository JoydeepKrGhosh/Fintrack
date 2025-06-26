// utils/transaction_process_utils/transactionHelpers.js

const TRANSACTION_TYPE_PATTERNS = {
  DEBIT: [
    /debited/, /purchased?/, /spent/, /charged/,
    /payment to/, /sent to/, /paid to/, /paid/i,
    /withdrawal/, /payment of/, /dr\b/i,
    /purchase(?: of)?/i, // ✅ handles "purchase of Rs. X"
    /used for a purchase/i // ✅ handles "used for a purchase"
  ],
  CREDIT: [
    /credited/, /received/, /refund/, /deposit/,
    /money added/, /cashback/, /reward/,
    /reversed/, /cr\b/i, /interest earned/
  ]
};


const PAYMENT_MODE_PATTERNS = {
  UPI: [/upi/i, /vpa/i, /@[a-z0-9]+/, /qr/i],
  CREDIT_CARD: [/credit card/i, /\bcc\b/i, /visa/i, /mastercard/i],
  DEBIT_CARD: [/debit card/i, /\bdc\b/i, /atm card/i],
  NETBANKING: [/net[ -]?banking/i, /imps/i, /neft/i, /rtgs/i],
  WALLET: [/wallet/i, /paytm/i, /amazon pay/i, /phonepe/i, /mobi?kwik/i],
  CASH: [/cash/i, /cod\b/i],
  EMI: [/emi/i, /equated monthly/i],
  LOAN: [/loan/i, /repayment/i]
};

function extractTransactionType(rawText) {
  if (!rawText || typeof rawText !== 'string') return 'UNKNOWN';
  
  const lower = rawText.toLowerCase();
  
  for (const [type, patterns] of Object.entries(TRANSACTION_TYPE_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(lower))) {
      return type;
    }
  }
  
  // Additional checks for amount-based detection
  const amountMatches = rawText.match(/(?:rs\.|₹|inr)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i);
  if (amountMatches) {
    const amount = parseFloat(amountMatches[1].replace(/,/g, ''));
    if (amount > 100000) return 'DEBIT'; // Large amounts more likely debits
  }
  
  return 'UNKNOWN';
}

function extractPaymentMode(rawText) {
  if (!rawText || typeof rawText !== 'string') return 'UNKNOWN';
  
  const lower = rawText.toLowerCase();
  
  // Special case for UPI first (most common in India)
  if (PAYMENT_MODE_PATTERNS.UPI.some(pattern => pattern.test(lower))) {
    return 'UPI';
  }
  
  for (const [mode, patterns] of Object.entries(PAYMENT_MODE_PATTERNS)) {
    if (mode !== 'UPI' && patterns.some(pattern => pattern.test(lower))) {
      return mode;
    }
  }
  
  // Fallback detection
  if (/card\s*[*]+\d{4}/i.test(rawText)) return 'CREDIT_CARD';
  if (/acct\s*[*]+\d{4}/i.test(rawText)) return 'NETBANKING';
  
  return 'UNKNOWN';
}

module.exports = {
  extractTransactionType,
  extractPaymentMode
};