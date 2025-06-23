// 1. Error handlers FIRST (before imports)
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});


const express = require("express");
require("dotenv").config();
const { PrismaClient } = require("@prisma/client"); // ✅ Import Prisma Client
const authRoutes = require("./src/routes/auth.route.js");


const { transactionWorker } = require('./src/workers/transactionProcessor.js');

const transactionRoutes = require('./src/routes/transactionroutes.js');

const prisma = new PrismaClient(); // ✅ Initialize Prisma Client
const app = express();
app.use(express.json());

if (process.env.NODE_ENV !== 'test') transactionWorker;

// Routes
app.use("/api/auth", authRoutes);
app.use('/api/transactions', transactionRoutes);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  try {
    // ✅ Prisma automatically handles tables via migrations
    await prisma.$connect(); // Test DB connection
    console.log("✔ Database connected via Prisma");
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
  }
});