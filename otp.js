import axios from "axios";

export const otpStore = {};

export async function sendOTP(phone) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  otpStore[phone] = otp;

  // IMPORTANT: For development/hackathon purposes, log the OTP in the console
  // because Fast2SMS often blocks the 'q' route due to DND registry in India.
  console.log(`\n========================================`);
  console.log(`[DEVELOPMENT] OTP for ${phone} is: ${otp}`);
  console.log(`========================================\n`);

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
    console.error("\n[Fast2SMS Error] SMS Failed. However, you can use the OTP logged above.");
    console.error("Reason:", err?.response?.data?.message || err?.message || err);
    // Returning true anyway so the frontend doesn't break and you can test the OTP flow
    return true; 
  }
}

export async function verifyOTP(phone, otp) {
  if (otpStore[phone] && otpStore[phone] === otp) {
    delete otpStore[phone];
    return true;
  }
  return false;
}
