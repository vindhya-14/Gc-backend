import Razorpay from "razorpay";
import crypto from "crypto";

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (!KEY_ID || !KEY_SECRET) {
  throw new Error("Missing Razorpay env vars");
}

export const razorpay = new Razorpay({
  key_id: KEY_ID,
  key_secret: KEY_SECRET,
});

export async function createOrder(amount, receiptId = `rcpt_${Date.now()}`) {
  const options = {
    amount: Math.round(amount * 100),
    currency: "INR",
    receipt: receiptId,
    payment_capture: 1,
  };
  return await razorpay.orders.create(options);
}

export function verifyPayment(order_id, payment_id, signature) {
  const body = order_id + "|" + payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", KEY_SECRET)
    .update(body)
    .digest("hex");

  return expectedSignature === signature;
}
