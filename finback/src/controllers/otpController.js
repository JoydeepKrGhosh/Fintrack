const { sendOtp } = require('../service/twilioService');
const prisma = require('../prisma-client');
require('dotenv').config();
let otpStore = {}; // in-memory (resets when server restarts)

const requestOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });

    const userId = req.user?.userId;

    const existingUser = await prisma.user.findUnique({ where: { id: userId } });

    if (existingUser?.mobileNumber && existingUser.mobileNumber !== phone) {
      return res.status(400).json({
        error: `You're already registered with ${existingUser.mobileNumber}. Please use the same number.`,
      });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    otpStore[phone] = { otp, expires: Date.now() + 2 * 60 * 1000 };


    console.log('Sending OTP:', otp, 'to phone:', phone);

    await sendOtp('+91' + phone, otp);

    return res.json({ success: true, message: 'OTP sent' });
  } catch (err) {
    console.error('OTP send error:', err);
    return res.status(500).json({ error: 'Failed to send OTP' });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const userId = req.user?.userId;

    if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });

    const record = otpStore[phone];
    if (!record) return res.status(400).json({ error: 'OTP not requested' });

    if (Date.now() > record.expires) {
      delete otpStore[phone];
      return res.status(400).json({ error: 'OTP expired' });
    }

    if (record.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });

    delete otpStore[phone]; // clear OTP


    const existingUser = await prisma.user.findUnique({ where: { id: userId } });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (existingUser.mobileNumber && existingUser.mobileNumber !== phone) {
      return res.status(400).json({
        error: `Your registered number is ${existingUser.mobileNumber}. Use that instead.`,
      });
    }

    // If not set before, update mobile number
    if (!existingUser.mobileNumber) {
      await prisma.user.update({
        where: { id: userId },
        data: { mobileNumber: phone },
      });
    }

    return res.json({ success: true, message: 'OTP verified and phone linked successfully' });
  } catch (err) {
    console.error('Error verifying OTP:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { requestOtp, verifyOtp };
