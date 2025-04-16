const { transactionQueue } = require("../queues/transactionQueue");

const testTransaction = async (req, res) => {
  const userId = req.user.userId;
  const { amount, category, merchant, date, type, source } = req.body;

  const transactionData = {
    userId,
    amount,
    category,
    merchant,
    date,
    type,
    source
  };

  try {
    await transactionQueue.add("processTransaction", transactionData);
    res.status(200).json({ message: "Transaction added to queue for processing." });
  } catch (error) {
    console.error("Failed to queue transaction:", error);
    res.status(500).json({ error: "Failed to add transaction to queue" });
  }
};

module.exports = { testTransaction };
