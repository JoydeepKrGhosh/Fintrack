const express = require("express");
require("dotenv").config();
const authRoutes = require("./src/routes/auth.route.js");
const transactionRoutes = require("./src/routes/transactionroutes.js");
const { createAllTables } = require("./src/models/createAllTables.js");
// ✅ Import the table creation
require("./src/workers/transactionProcessor.js"); // Background worker

const app = express();
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  try {
    await createAllTables(); // ✅ Create tables in order
  } catch (err) {
    console.error("❌ Failed to initialize database.");
  }
});
