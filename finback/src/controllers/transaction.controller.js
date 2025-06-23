// ✅ Required imports
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger.js');
const { validateInput, extractAmount } = require('../utils/transaction_process_utils/transactionValidators');
const { processMerchant } = require('../utils/transaction_process_utils/merchantProcessor');
const { checkForDuplicates } = require('../utils/transaction_process_utils/duplicateChecker');
const { queueTransactionProcessing, retryMatchLater } = require('../utils/transaction_process_utils/queueService');
const { createTransaction } = require('../utils/transaction_process_utils/transactionService.js');
const { extractProductNames } = require('../utils/transaction_process_utils/emailHelpers.js');
const { findPotentialMatch } = require('../utils/transaction_process_utils/transactionMatcher.js');
const { extractTransactionType, extractPaymentMode } = require('../utils/transaction_process_utils/transactionTypeMode.js');

const prisma = new PrismaClient();


// Matching configuration constants
const MATCH_WINDOW_MINUTES = 10; // Time window for email↔SMS matching in minutes

// Basic metric logger
function recordMetric(metricName, data = {}) {
  console.log(`[METRIC] ${metricName}:`, data);
  // Optionally send to external monitoring platforms
}



async function extractTransaction(req, res) {
  const { rawText, sourceType, senderInfo, userId } = req.body;
  const txLogger = logger.withTransaction('pending');
  txLogger.info('📥 Incoming transaction request received', { rawText, sourceType, senderInfo, userId });

  const startTime = Date.now();
  if (!validateInput(res, txLogger, rawText, sourceType, userId)) return;

  try {
    const { amount, error: amountError } = extractAmount(rawText, txLogger);
    txLogger.debug('Amount extraction result', { amount, amountError });
    if (amountError) return res.status(400).json(amountError);

    const transactionDate = new Date();
    const isEmail = sourceType === 'email';
    let productNames = isEmail ? extractProductNames(rawText) : [];

    const transactionType = extractTransactionType(rawText); // Credit or Debit
    const paymentMode = extractPaymentMode(rawText); // UPI, Card, etc.

    const { merchantRecord, merchantError } = await processMerchant(rawText, senderInfo, txLogger);
    txLogger.debug('Merchant record received', merchantRecord);
    if (merchantError) {
      txLogger.error('❌ Merchant processing failed', merchantError);
      return res.status(merchantError.status).json(merchantError);
    }

    let isDuplicate = false;
    try {
      isDuplicate = await checkForDuplicates(userId, amount, merchantRecord, transactionDate,sourceType, txLogger);
      txLogger.debug('[TX:pending] 🔎 Duplicate check result', { isDuplicate });
      if (isDuplicate) {
        txLogger.warn('[TX:pending] Duplicate transaction detected');
        return res.status(409).json({
          error: 'Duplicate transaction detected',
          resolution: 'Try again after 10 minutes'
        });
      }
    } catch (err) {
      txLogger.error('[TX:pending] ❌ Error during duplicate check', {
        message: err.message,
        stack: err.stack
      });
      return res.status(500).json({
        error: 'Internal error during duplicate check',
        referenceId: `ERR-DUP-${Date.now()}`
      });
    }

    const matchedTxn = await findPotentialMatch({
      userId,
      merchantId: merchantRecord.id,
      amount,
      timestamp: transactionDate,
      sourceType
    });

    txLogger.debug('🔍 matchedTxn value', { matchedTxn });

    if (matchedTxn) {
      try {
        await prisma.transactionMetadata.upsert({
          where: { transactionId: matchedTxn.id },
          update: {
            productDetails: productNames.join(', '),
            transactionType,
            paymentMode,
            matchStatus: 'MATCHED',
            matchExpiresAt: null
          },
          create: {
            transactionId: matchedTxn.id,
            productDetails: productNames.join(', '),
            transactionType,
            paymentMode,
            matchStatus: 'MATCHED'
          }
        });
        txLogger.info('✅ Metadata updated/upserted successfully');
      } catch (metaErr) {
        txLogger.error('❌ Failed to update metadata', { error: metaErr.message, stack: metaErr.stack });
      }

      const latency = Date.now() - startTime;
      recordMetric('match_attempts', { success: true });
      recordMetric('match_latency', latency);
      recordMetric('source_type_analysis', sourceType);

      txLogger.info('🔁 Matched to existing transaction. Enqueueing enriched transaction.', {
        transactionId: matchedTxn.id
      });

      await queueTransactionProcessing(matchedTxn, txLogger);

      return res.status(202).json({
        message: 'Matched and enriched transaction.',
        transactionId: matchedTxn.id
      });
    }

    let transaction;
    try {
      const result = await createTransaction({
        userId,
        rawText,
        amount,
        merchantId: merchantRecord.id,
        transactionDate,
        sourceType,
        senderInfo
      }, txLogger);

      transaction = result.transaction;
      txLogger.debug('Transaction creation result', result);

      if (result.creationError) {
        txLogger.error('❌ Transaction creation failed', result.creationError);
        return res.status(500).json(result.creationError);
      }
    } catch (creationException) {
      txLogger.error('❌ Exception during transaction creation', {
        message: creationException.message,
        stack: creationException.stack
      });
      return res.status(500).json({
        error: 'Exception during transaction creation',
        referenceId: `ERR-CREATE-${Date.now()}`
      });
    }

    const matchExpiresAt = new Date(Date.now() + MATCH_WINDOW_MINUTES * 60 * 1000);

    await prisma.transactionMetadata.create({
      data: {
        transactionId: transaction.id,
        productDetails: isEmail ? productNames.join(', ') : null,
        matchStatus: 'PENDING',
        matchExpiresAt,
        transactionType,
        paymentMode
      }
    });

    txLogger.info('📝 Metadata created for new transaction', {
      transactionId: transaction.id,
      transactionType,
      paymentMode
    });

    await retryMatchLater(transaction, txLogger);


    recordMetric('match_attempts', { success: false });
    recordMetric('source_type_analysis', sourceType);

    return res.status(202).json({
      message: 'Transaction accepted for processing',
      transactionId: transaction.id,
      nextSteps: {
        checkStatus: `/api/transactions/${transaction.id}/status`,
        typicalProcessingTime: '2-5 minutes'
      }
    });
  } catch (error) {
    txLogger.error('Transaction processing failed', {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      error: 'Internal server error',
      referenceId: `ERR-${Date.now()}`
    });
  }
}

module.exports = { extractTransaction };
