// routes/verify-payment.js
import { verifyPayment } from "../razorpay";
import { createEvent } from "../google"; 

export default async function handler(req, res) {
  try {
    let body = "";
    for await (const chunk of req) body += chunk;
    const data = body ? JSON.parse(body) : {};

    const { order_id, payment_id, signature, name, email, phone, start } = data;

    if (!order_id || !payment_id || !signature) {
      res.statusCode = 400;
      res.end(
        JSON.stringify({ error: "Missing Razorpay verification fields" })
      );
      return;
    }

    const valid = verifyPayment(order_id, payment_id, signature);

    if (!valid) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "Invalid signature" }));
      return;
    }

    // Payment verified → create calendar event (your existing function)
    // start must be ISO string accepted by your calendar createEvent
    const evt = await createEvent({ name, email, phone, start });

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: true, event: evt }));
  } catch (err) {
    console.error("verify-payment error:", err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "Server error" }));
  }
}
