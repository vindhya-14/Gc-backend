import { sendOTP } from "../lib/google.js";

export default async function handler(req, res) {
  let body = "";
  for await (const chunk of req) body += chunk;

  const { email } = JSON.parse(body || "{}");

  if (!email) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "Missing email" }));
    return;
  }

  await sendOTP(email);

  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ success: true }));
}
