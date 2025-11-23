// routes/create-order.js
import { createOrder } from "../razorpay";

export default async function handler(req, res) {
  try {
    let body = "";
    for await (const chunk of req) body += chunk;
    const data = body ? JSON.parse(body) : {};

    // amount: number in INR (example: 199.0)
    // meta: optional metadata like email/name/start for reference
    const { amount, email, meta } = data;

    if (!amount || !email) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "Missing fields: amount or email" }));
      return;
    }

    const order = await createOrder(amount, `receipt_${Date.now()}`);

    // Return order AND Razorpay key id (client needs key id to open checkout)
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        order,
        key_id: process.env.RAZORPAY_KEY_ID,
        meta: meta || null,
      })
    );
  } catch (err) {
    console.error("create-order error:", err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "Server error" }));
  }
}
