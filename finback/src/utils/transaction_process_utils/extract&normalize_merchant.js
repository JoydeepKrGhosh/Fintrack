/**
 * Extracts and normalizes merchant names from transaction messages
 * @param {string} rawText - Raw SMS/email content
 * @param {string} senderInfo - Sender identifier (SMS short code/email address)
 * @returns {string|null} - Normalized merchant name or null if unparseable
 */
function extractMerchant(rawText, senderInfo) {
  if (!rawText) return null;

  const currencyTokens = ['INR', 'RS', 'INR.', 'RS.'];

  const transactionPatterns = [
    /(?:to|paid to|payment to)\s+([A-Z0-9*]+)/i,
    /via\s+upi\s+to\s+([A-Z0-9*]+)/i,
    /for\s+(SWIGGY|ZOMATO|AMAZON|FLIPKART|BIGBASKET)/i,
    /order\s+(?:from|with)\s+([A-Z0-9*]+)/i,
    /at\s+([a-z0-9]+(?:\.[a-z]{2,6})?)\b/i
  ];

  for (const pattern of transactionPatterns) {
    const match = rawText.match(pattern);
    if (match) {
      let merchant = match[1].replace(/\*.*$/, ''); // Remove suffixes
      merchant = normalizeMerchantName(merchant);
      if (merchant && !currencyTokens.includes(merchant.toUpperCase())) {
        return merchant;
      }
    }
  }

  // Fallback to senderInfo — useful for emails like order@swiggy.in
  if (senderInfo) {
    const domainMatch = senderInfo.match(/@?([a-z0-9-]+)\./i);
    let fallbackName = domainMatch ? domainMatch[1] : senderInfo;
    
    const cleanSender = fallbackName
      .replace(/[^A-Z0-9]/gi, '')
      .toUpperCase();

    const MERCHANT_MAP = {
      'ZOMATO': 'ZOMATO',
      'ZMT': 'ZOMATO',
      'SWIGGY': 'SWIGGY',
      'SWGY': 'SWIGGY',
      'FLIPKART': 'FLIPKART',
      'AMAZON': 'AMAZON',
      'BIGBASKET': 'BIGBASKET'
    };

    return MERCHANT_MAP[cleanSender] || normalizeMerchantName(cleanSender);
  }

  return null;
}


/**
 * Normalizes merchant names to consistent format
 * Converts to lowercase with dashes
 */
function normalizeMerchantName(name) {
  if (!name || typeof name !== 'string') return null;

  let normalized = name
    .trim()
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/[^a-z0-9]/g, '-')   // Convert special chars to hyphen
    .replace(/-+/g, '-')          // Collapse multiple hyphens
    .replace(/^-+|-+$/g, '');     // Trim leading/trailing hyphens

  return normalized.length >= 3 ? normalized.slice(0, 64) : null;
}

module.exports = {
  extractMerchant,
  normalizeMerchantName
};
