import nodemailer from "nodemailer";

export const otpStore = {};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendOTP(email) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  otpStore[email] = otp;

  console.log("\n========================================");
  console.log(`[DEV] Check OTP for ${email}: ${otp}`);
  console.log("========================================\n");

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 16px; color: #333;">
      <h2 style="color: #2E7D32;">Your Verification Code</h2>
      <p>Hi there,</p>
      <p>Your one-time password (OTP) for CliniQ Assist is:</p>
      <div style="font-size: 24px; font-weight: bold; margin: 20px 0; padding: 16px; background: #f7f7f7; border-radius: 8px; text-align: center; letter-spacing: 4px;">
        ${otp}
      </div>
      <p>If you didn't request this code, you can safely ignore this email.</p>
      <p style="margin-top: 24px;">Thank you for choosing <strong>CliniQ Assist</strong>.</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `CliniQ Assist <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: "Your CliniQ Assist Verification Code",
      html,
    });

    console.log(`[Email OTP] Successfully sent to ${email}`);
    return true;
  } catch (err) {
    console.error("\n[Email OTP ERROR]");
    console.error(err.message || err);
    return false;
  }
}

export async function verifyOTP(email, otp) {
  if (otpStore[email] && otpStore[email] === otp) {
    delete otpStore[email];
    return true;
  }
  return false;
}