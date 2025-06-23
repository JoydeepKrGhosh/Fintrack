const dotenv = require('dotenv');
doteenv.config();
// Twilio configuration
const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH;
const phone = process.env.TWILIO_PHONE;
const serviceSID = process.env.SERVICE_SID;
const client = require('twilio')(accountSid, authToken);

client.verify.v2.services(serviceSID)
      .verificationChecks
      .create({to: phone, code: '[Code]'})
      .then(verification_check => console.log(verification_check.status));