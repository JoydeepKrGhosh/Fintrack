const express = require('express');
const { extractTransaction } = require('../controllers/transaction.controller.js');
const router = express.Router();

// POST /api/transactions
router.post('/', extractTransaction);

module.exports = router;