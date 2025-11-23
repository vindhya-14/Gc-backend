import { verifyPayment } from "../lib/razorpay.js";
import { createEvent } from "../lib/google.js";

export default async function handler(req, res) {
  try {
    let body = "";
    for await (const chunk of req) body += chunk;

    const data = body ? JSON.parse(body) : {};
    const { order_id, payment_id, signature, name, email, phone, start } = data;

    if (!order_id || !payment_id || !signature) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "Missing fields" }));
      return;
    }

    const ok = verifyPayment(order_id, payment_id, signature);

    if (!ok) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "Invalid signature" }));
      return;
    }

    // Payment OK → Create event
    const evt = await createEvent({ name, email, phone, start });

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: true, event: evt }));
  } catch (err) {
    console.error("verify-payment error:", err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "Server error" }));
  }
}
