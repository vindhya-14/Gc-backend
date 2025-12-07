import nodemailer from "nodemailer";

// -----------------------------------------
// CREATE TRANSPORTER (must be defined here)
// -----------------------------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_FROM, // example: cliniqassist@gmail.com
    pass: process.env.EMAIL_PASS,
  },
});

// -----------------------------------------
// SEND CONFIRMATION EMAIL
// -----------------------------------------
export async function sendConfirmationEmail({ to, name, appointmentId, date }) {
  // Build email HTML
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 16px; color: #333;">
      <h2 style="color: #2E7D32;">Appointment Confirmed ✔</h2>

      <p>Hi <strong>${name}</strong>,</p>

      <p>Your appointment has been successfully scheduled. Below are the details for your reference:</p>

      <div style="margin: 20px 0; padding: 16px; background: #f7f7f7; border-radius: 8px;">
        <p><strong>Appointment ID:</strong> ${appointmentId}</p>
        <p><strong>Date & Time:</strong> ${date}</p>
      </div>

      <p>If you need to make any changes or have questions, feel free to reach out—we’re always here to help.</p>

      <p style="margin-top: 24px;">Thank you for choosing <strong>CliniQ Assist</strong> for your healthcare needs.</p>

      <p style="margin-top: 16px;">Warm regards,<br /><strong>CliniQ Assist Team</strong></p>
    </div>
  `;

  // -----------------------------------------
  // SEND EMAIL
  // -----------------------------------------
  await transporter.sendMail({
    from: `CliniQ Assist <${process.env.EMAIL_FROM}>`, // sender name
    to,
    subject: "Your Appointment is Confirmed – CliniQ Assist ✔",
    html,
  });
}
