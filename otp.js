import twilio from "twilio";

export const otpStore = {};

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

export async function sendOTP(phone) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  otpStore[phone] = otp;

  await client.messages.create({
    from: process.env.TWILIO_PHONE,
    to: phone,
    body: `Your CliniQ Assist verification code is: ${otp}`,
  });

  return true;
}

export async function verifyOTP(phone, otp) {
  if (otpStore[phone] && otpStore[phone] === otp) {
    delete otpStore[phone];
    return true;
  }
  return false;
}
