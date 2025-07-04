const express = require('express');
const router = express.Router();
const debtController = require('../controllers/debt.controller.js');
//const { authenticate } = require('../middleware/auth');

// Apply authentication middleware to all debt routes
//router.use(authenticate);

// Create a new debt
router.post('/', debtController.debtValidationRules, debtController.createDebt);

// Get all debts for the authenticated user
router.get('/', debtController.getUserDebts);

// Get a specific debt
router.get('/:id', debtController.getDebt);

// Update a debt
router.put('/:id', debtController.debtValidationRules, debtController.updateDebt);

// Delete a debt
router.delete('/:id', debtController.deleteDebt);

module.exports = router;