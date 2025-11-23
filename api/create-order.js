import { createOrder } from "../lib/razorpay.js";

export default async function handler(req, res) {
  try {
    let body = "";
    for await (const chunk of req) body += chunk;

    const data = body ? JSON.parse(body) : {};
    const { amount, email, meta } = data;

    if (!amount || !email) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "Missing fields" }));
      return;
    }

    const order = await createOrder(amount);

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
