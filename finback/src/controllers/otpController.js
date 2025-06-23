const { sendOtp } = require('../service/twilioService');

let otpStore = {}; // in-memory (resets when server restarts)

const requestOtp = async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });

  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  otpStore[phone] = { otp, expires: Date.now() + 2 * 60 * 1000 }; // 2 min

  try {
    await sendOtp(phone, otp);
    res.json({ success: true, message: 'OTP sent' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

const verifyOtp = (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });

  const record = otpStore[phone];
  if (!record) return res.status(400).json({ error: 'OTP not requested' });

  if (Date.now() > record.expires) {
    delete otpStore[phone];
    return res.status(400).json({ error: 'OTP expired' });
  }

  if (record.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });

  delete otpStore[phone]; // optional: clear used OTP
  res.json({ success: true, message: 'OTP verified' });
};


module.exports={requestOtp, verifyOtp};