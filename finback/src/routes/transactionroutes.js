const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/auth.middleware.js");
const { testTransaction } = require("../controllers/testTransactionController.js");

router.post("/user", authenticate, testTransaction);

module.exports = router;
