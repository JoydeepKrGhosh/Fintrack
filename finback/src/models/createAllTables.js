const { createUsersTable } = require("./user.model.js");
const { createCategoriesTable } = require("./category.model.js");
const { createMerchantsTable } = require("./merchant.model.js");
const { createTransactionsTable } = require("./transaction.model.js");

const createAllTables = async () => {
  try {
    await createUsersTable();
    console.log("✅ Users table created or already exists.");

    await createCategoriesTable();
    console.log("✅ Categories table created or already exists.");

    await createMerchantsTable();
    console.log("✅ Merchants table created or already exists.");

    await createTransactionsTable();
    console.log("✅ Transactions table created or already exists.");
  } catch (err) {
    console.error("❌ Error creating tables:", err);
    throw err;
  }
};

module.exports = { createAllTables };
