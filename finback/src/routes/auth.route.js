const express = require("express");
const { requestOtp, verifyOtp } = require("../controllers/otpController.js");
const { googleAuthController } = require("../controllers/auth.controller.js");
const authMiddleware = require("../middleware/auth.middleware.js");

const router = express.Router();
router.get('/ping', (req, res) => {
    res.json({ message: 'Server is alive 🎉' });
});

router.post('/google', googleAuthController);
router.post('/send-otp', authMiddleware, requestOtp);
router.post('/verify-otp', authMiddleware, verifyOtp);

module.exports = router;
