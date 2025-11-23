import { verifyOTP } from "../lib/google.js";

export default async function handler(req, res) {
  let body = "";
  for await (const chunk of req) body += chunk;

  const { email, otp } = JSON.parse(body || "{}");

  if (!email || !otp) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "Missing fields" }));
    return;
  }

  const valid = await verifyOTP(email, otp);

  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ valid }));
}
