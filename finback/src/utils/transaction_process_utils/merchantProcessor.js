const { PrismaClient } = require('@prisma/client');
const { extractMerchant } = require('./extract&normalize_merchant.js');

const logger = require('../logger.js');

const prisma = new PrismaClient();


async function processMerchant(rawText, senderInfo, logger) {
  try {
    const rawMerchant = extractMerchant(rawText, senderInfo);
    
    if (!rawMerchant || rawMerchant.length < 3) {
      logger.error('Invalid merchant extracted', { rawText, senderInfo });
      return { merchantError: {
        status: 400,
        error: "Invalid merchant",
        resolution: "Include clear merchant name"
      }};
    }

    const merchantRecord = await registerMerchant(rawMerchant);
    logger.debug('Merchant processed for registration', { 
      id: merchantRecord.id,
      name: merchantRecord.normalizedName 
    });

    return { merchantRecord };
  } catch (error) {
    logger.error('Merchant processing failed', error);
    return { merchantError: {
      status: error.message.includes('Invalid') ? 400 : 500,
      error: "Merchant processing failed",
      details: error.message
    }};
  }
}

// Predefined error codes
const ERROR_CODES = {
  INVALID_INPUT: 'INVALID_INPUT',
  NORMALIZATION_FAILED: 'NORMALIZATION_FAILED',
  DUPLICATE_MERCHANT: 'DUPLICATE_MERCHANT',
  DATABASE_ERROR: 'DATABASE_ERROR'
};

const registerMerchant = async (rawName) => {
  // Validate input more strictly
  
  if (!rawName || typeof rawName !== 'string' || rawName.trim().length < 2) {
    throw Object.assign(new Error(`Invalid merchant name: ${rawName}`), {
      code: ERROR_CODES.INVALID_INPUT,
      details: { 
        minLength: 2,
        maxLength: 255,
        allowedChars: 'Alphanumeric, spaces, and hyphens'
      }
    });
  }

  // Enhanced normalization
  let normalized;
  try {
    normalized = rawName
      .normalize('NFKC') // Normalize unicode characters
      .trim()
      .replace(/[^\w\s-]/g, '') // More precise character set
      .replace(/\s+/g, '-')
      .toLowerCase()
      .slice(0, 64);
  } catch (error) {
    throw Object.assign(new Error('Name normalization failed'), {
      code: ERROR_CODES.NORMALIZATION_FAILED,
      originalError: error
    });
  }

  if (!normalized || normalized.length < 2) {
    throw Object.assign(new Error('Name became invalid after normalization'), {
      code: ERROR_CODES.NORMALIZATION_FAILED,
      originalName: rawName,
      normalizedResult: normalized
    });
  }

  try {
    return await prisma.$transaction(async (tx) => {
      // Check for existing similar merchants first to prevent duplicates
      const existing = await tx.merchant.findFirst({
        where: {
          OR: [
            { normalizedName: normalized },
            { name: { equals: rawName.trim(), mode: 'insensitive' } }
          ]
        }
      });

      if (existing) {
        logger.debug('Found existing merchant', { 
          existingId: existing.id,
          inputName: rawName 
        });
        return existing;
      }

      return await tx.merchant.create({
        data: {
          name: rawName.trim().slice(0, 255),
          normalizedName: normalized
        },
        select: {
          id: true,
          name: true,
          normalizedName: true,
        }
      });
    });
  } catch (error) {
    logger.error('Merchant registration failed', {
      error: {
        code: error.code,
        message: error.message,
        stack: error.stack
      },
      input: {
        rawName,
        normalized,
        length: rawName.length
      },
      timestamp: new Date().toISOString()
    });

    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      throw Object.assign(new Error('Merchant with similar name already exists'), {
        code: ERROR_CODES.DUPLICATE_MERCHANT,
        meta: error.meta
      });
    }

    throw Object.assign(new Error('Database operation failed'), {
      code: ERROR_CODES.DATABASE_ERROR,
      originalError: error
    });
  }
};

module.exports = {
  registerMerchant,
  processMerchant,
  ERROR_CODES // Export error codes for testing
};







