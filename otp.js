import axios from "axios";

export const otpStore = {};

export async function sendOTP(phone) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  otpStore[phone] = otp;

  const message = `Your CliniQ Assist verification code is: ${otp}`;

  try {
    await axios.get("https://www.fast2sms.com/dev/bulkV2", {
      params: {
        authorization: process.env.FAST2SMS_API_KEY,
        route: "q",
        message,
        numbers: phone,
        flash: "0",
      },
    });

    return true;
  } catch (err) {
    console.error("Fast2SMS Error:", err?.response?.data || err);
    return false;
  }
}

export async function verifyOTP(phone, otp) {
  if (otpStore[phone] && otpStore[phone] === otp) {
    delete otpStore[phone];
    return true;
  }
  return false;
}
