import axios from "axios";

export const otpStore = {};

export async function sendOTP(phone) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  
  otpStore[phone] = otp;

  console.log("\n========================================");
  console.log(`[DEV] OTP for ${phone}: ${otp}`);
  console.log("========================================\n");

  try {
    // ⚠️ Fast2SMS OTP route (requires proper setup)
    const response = await axios.get("https://www.fast2sms.com/dev/bulkV2", {
      params: {
        authorization: process.env.FAST2SMS_API_KEY,
        route: "otp", 
        variables_values: otp, 
        numbers: phone,
      },
    });

    console.log("[Fast2SMS Response]:", response.data);

    return true;
  } catch (err) {
    console.error("\n[Fast2SMS ERROR]");
    console.error(err?.response?.data || err.message);

    
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