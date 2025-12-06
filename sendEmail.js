import nodemailer from "nodemailer";

export async function sendConfirmationEmail({ to, name, appointmentId, date }) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_FROM,
      pass: process.env.EMAIL_PASS,
    },
  });

  const html = `
  <h2>Your Appointment is Confirmed!</h2>
  <p>Hello <strong>${name}</strong>,</p>
  <p>Your appointment has been successfully scheduled.</p>
  <ul>
    <li><strong>Appointment ID:</strong> ${appointmentId}</li>
    <li><strong>Date & Time:</strong> ${date}</li>
  </ul>
  <p>Thank you for choosing CliniQ Assist.</p>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Your Appointment Confirmation",
    html,
  });
}
