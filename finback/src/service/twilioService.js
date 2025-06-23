const twilio = require('twilio');
require('dotenv').config();

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

const sendOtp = async (phone, otp) => {
    return client.messages.create({
        body: `Your Fintrack OTP is: ${otp}`,
        from: process.env.TWILIO_PHONE,
        to: phone,
    });
};

module.exports = { sendOtp };
