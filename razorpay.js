// utils/razorpay.js
import Razorpay from "razorpay";
import crypto from "crypto";

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (!KEY_ID || !KEY_SECRET) {
  throw new Error(
    "Missing Razorpay env vars (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)."
  );
}

export const razorpay = new Razorpay({
  key_id: KEY_ID,
  key_secret: KEY_SECRET,
});

/**
 * createOrder(amount, receiptId)
 * amount in INR (number) -> will be converted to paise inside
 * receiptId: string (optional)
 */
export async function createOrder(amount, receiptId = `rcpt_${Date.now()}`) {
  const options = {
    amount: Math.round(amount * 100), // ₹ to paise
    currency: "INR",
    receipt: receiptId,
    payment_capture: 1, // auto-capture
  };

  const order = await razorpay.orders.create(options);
  return order;
}

/**
 * verifyPayment(order_id, payment_id, signature)
 * returns true/false
 */
export function verifyPayment(order_id, payment_id, signature) {
  const body = order_id + "|" + payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", KEY_SECRET)
    .update(body)
    .digest("hex");

  return expectedSignature === signature;
}

export default {
  createOrder,
  verifyPayment,
};
