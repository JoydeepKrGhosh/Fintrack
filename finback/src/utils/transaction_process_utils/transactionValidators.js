// Helper functions
const { Decimal } = require('@prisma/client/runtime/library');

function validateInput(res, logger, rawText, sourceType, userId) {
  if (!rawText || !sourceType || !userId) {
    logger.error('Missing required fields');
    res.status(400).json({ 
      error: "Missing required fields: rawText, sourceType, userId",
      details: { received: { rawText, sourceType, userId } }

    });
    return false;
  }

  if (!['sms', 'email'].includes(sourceType)) {
    logger.error(`Invalid sourceType: ${sourceType}`);
    res.status(400).json({ 
      error: "Invalid sourceType. Must be 'sms' or 'email'",
      received: sourceType 
    });
    return false;
  }

  return true;
}

function extractAmount(rawText, logger) {
  const amountMatch = rawText.match(/(?:₹|INR|Rs\.?)\s*([\d,]+\.\d{2}|\d+)/i);

  const amountValue = amountMatch?.[1] || amountMatch?.[2];

  if (!amountValue) {
    logger.error('Amount extraction failed', { rawText });
    return { error: {
      error: "Could not extract valid amount",
      exampleFormats: ["INR 1,234.56", "Rs.599.00"] 
    }};
  }

  const parsedAmount = parseFloat(amountValue.replace(/,/g, ''));
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    logger.error('Invalid amount parsed', { amount: amountValue });
    return { error: {
      error: "Amount must be > 0",
      parsedValue: amountValue 
    }};
  }

  return { amount: new Decimal(parsedAmount) };
}


module.exports = { validateInput, extractAmount };