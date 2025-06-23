const express = require("express");
const { signup, login, logout } = require("../controllers/auth.controller.js");
const { requestOtp, verifyOtp } = require("../controllers/otpController.js");

const router = express.Router();
router.get('/ping', (req, res) => {
    res.json({ message: 'Server is alive 🎉' });
});

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post('/send-otp', requestOtp);
router.post('/verify-otp', verifyOtp);

module.exports = router;
