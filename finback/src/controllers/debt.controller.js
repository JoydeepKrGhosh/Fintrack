const prisma = require('../prisma-client');
const { body, validationResult } = require('express-validator');

// Updated validation rules to include userId
const debtValidationRules = [
  body('userId').notEmpty().withMessage('User ID is required'), // Add this line
  body('name').notEmpty().withMessage('Name is required'),
  body('principal').isDecimal().withMessage('Principal must be a decimal number'),
  // ... keep all other existing validation rules
];

// Updated createDebt function
const createDebt = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { userId, ...debtData } = req.body;

    // Verify user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userExists) {
      return res.status(400).json({ error: "User not found" });
    }

    const debt = await prisma.debt.create({
      data: {
        userId,
        ...debtData,
        balance: debtData.balance || debtData.principal, // Default balance
      }
    });

    res.status(201).json(debt);
  } catch (error) {
    console.error('Error creating debt:', error);
    res.status(500).json({ error: 'Failed to create debt' });
  }
};

// Updated get functions to use userId from body instead of req.user
const getUserDebts = async (req, res) => {
  try {
    const { userId } = req.body; // Changed from req.user to req.body
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const debts = await prisma.debt.findMany({
      where: { userId },
      include: {
        payments: {
          orderBy: { paymentDate: 'desc' },
          take: 5,
        },
      },
    });

    res.json(debts);
  } catch (error) {
    console.error('Error fetching debts:', error);
    res.status(500).json({ error: 'Failed to fetch debts' });
  }
};

// Similarly update other functions (getDebt, updateDebt, deleteDebt)
const getDebt = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body; // Changed from req.user

    const debt = await prisma.debt.findUnique({
      where: { id: parseInt(id) },
      include: { payments: true },
    });

    if (!debt || debt.userId !== userId) {
      return res.status(404).json({ error: 'Debt not found' });
    }

    res.json(debt);
  } catch (error) {
    console.error('Error fetching debt:', error);
    res.status(500).json({ error: 'Failed to fetch debt' });
  }
};

// Update and delete functions follow the same pattern...

// UPDATE
const updateDebt = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const updatedDebt = await prisma.debt.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(updatedDebt);
  } catch (error) {
    res.status(500).json({ error: "Failed to update debt" });
  }
};

// DELETE
const deleteDebt = async (req, res) => {
  try {
    await prisma.debt.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete debt" });
  }
};

module.exports = {
  debtValidationRules,
  createDebt,
  getUserDebts,
  getDebt,
  updateDebt,
  deleteDebt,
};