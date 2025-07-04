// 1. Error handlers FIRST (before imports)
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

const express = require("express");
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const authRoutes = require("./src/routes/auth.route.js");
const fetchGmailRoutes = require('./src/routes/gmailFetchRoute.js');
const { transactionWorker } = require('./src/workers/transactionProcessor.js');
const transactionRoutes = require('./src/routes/transactionroutes.js');
const generateMonthlyScores = require('./cron/generateMonthlyScore'); // Fixed import

const debtRoutes = require('./src/routes/debt.routes.js');


const prisma = new PrismaClient(); // ✅ Initialize Prisma Client
const app = express();
app.use(express.json());

if (process.env.NODE_ENV !== 'test') transactionWorker;

// Routes
app.use("/api/auth", authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api', fetchGmailRoutes);
app.use('/api/debts', debtRoutes);


// 🧪 TEST-ONLY ROUTE — Monthly Score Job Trigger
app.get('/api/run-score-job', async (req, res) => {
  try {
    const offset = parseInt(req.query.offset) || 0; // Changed default to 0 (current month)
    const forceCurrentMonth = req.query.current === 'true'; // New flag
    
    console.log('🚀 [Test Route] Triggering score generation with offset:', offset, 
               '| Force current month:', forceCurrentMonth);
    
    if (forceCurrentMonth) {
      // For testing with current month data regardless of offset
      await generateMonthlyScores(0); // Always use current month
    } else {
      await generateMonthlyScores(offset);
    }
    
    res.status(200).send('✅ Monthly score generation complete');
  } catch (err) {
    console.error('❌ Error running score job:', err);
    res.status(500).send('❌ Error during score generation');
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
  require('./cron/gmailCron');
  try {
    await prisma.$connect(); // Test DB connection
    console.log("✔ Database connected via Prisma");
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
  }
});
