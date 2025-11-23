// index.js (Vercel serverless)
import { parse } from "url";
import googleMod from "./google.js";
import Razorpay from "razorpay";

const {
  startAuth,
  handleCallback,
  getFreeBusy,
  createEvent,
  listEvents,
  updateEvent,
  deleteEvent,
  sendOTP,
  verifyOTP,
} = googleMod;

// helper: read JSON body for POST
async function readBody(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch (e) {
    return {};
  }
}

// Razorpay Instance
const razor = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export default async function handler(req, res) {
  const { pathname } = parse(req.url, true);

  try {
    // =======================
    // Health Check
    // =======================
    if (pathname === "/" && req.method === "GET") {
      res.setHeader("Content-Type", "text/plain");
      res.end("Google Calendar Backend Running");
      return;
    }

    // =======================
    // OAuth Start
    // =======================
    if (pathname === "/auth" && req.method === "GET") {
      const url = startAuth();
      res.writeHead(302, { Location: url });
      res.end();
      return;
    }

    // =======================
    // OAuth Callback
    // =======================
    if (pathname === "/oauth/callback" && req.method === "GET") {
      const urlObj = new URL(req.url, `https://${req.headers.host}`);
      const code = urlObj.searchParams.get("code");

      if (!code) {
        res.statusCode = 400;
        res.end("Missing code");
        return;
      }

      await handleCallback(code);

      res.setHeader("Content-Type", "text/html");
      res.end("<h3>Authentication Successful! You can close this window.</h3>");
      return;
    }

    // =======================
    // Fetch Available Slots
    // =======================
    if (pathname === "/slots" && req.method === "POST") {
      const body = await readBody(req);
      const date = body.date;

      if (!date) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Missing date" }));
        return;
      }

      const slots = await getFreeBusy(date);

      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(slots));
      return;
    }

    // =======================
    // Create Calendar Event
    // =======================
    if (pathname === "/create" && req.method === "POST") {
      const body = await readBody(req);
      const { name, email, phone, start } = body;

      if (!name || !email || !start) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Missing fields" }));
        return;
      }

      const evt = await createEvent({ name, email, phone, start });

      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(evt));
      return;
    }

    // =======================
    // List Events
    // =======================
    if (pathname === "/list" && req.method === "POST") {
      const body = await readBody(req);
      const email = body.email;

      if (!email) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Missing email" }));
        return;
      }

      const items = await listEvents(email);

      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(items));
      return;
    }

    // =======================
    // Update Event
    // =======================
    if (pathname === "/update" && req.method === "POST") {
      const body = await readBody(req);
      const { eventId, start } = body;

      if (!eventId || !start) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Missing fields" }));
        return;
      }

      const updated = await updateEvent(eventId, start);

      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(updated));
      return;
    }

    // =======================
    // Delete Event
    // =======================
    if (pathname === "/delete" && req.method === "POST") {
      const body = await readBody(req);
      const { eventId } = body;

      if (!eventId) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Missing eventId" }));
        return;
      }

      const result = await deleteEvent(eventId);

      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(result));
      return;
    }

    // =======================
    // Send OTP
    // =======================
    if (pathname === "/send-otp" && req.method === "POST") {
      const body = await readBody(req);
      const email = body.email;

      if (!email) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Missing email" }));
        return;
      }

      await sendOTP(email);

      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // =======================
    // Verify OTP
    // =======================
    if (pathname === "/verify-otp" && req.method === "POST") {
      const body = await readBody(req);
      const { email, otp } = body;

      if (!email || !otp) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Missing fields" }));
        return;
      }

      const ok = await verifyOTP(email, otp);

      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ valid: ok }));
      return;
    }

    // ====================================================
    // 🔵 CREATE PAYMENT LINK (Razorpay)
    // ====================================================
    if (pathname === "/create-payment-link" && req.method === "POST") {
      const body = await readBody(req);
      const { name, email, phone, amount, start } = body;

      if (!name || !email || !phone || !amount || !start) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Missing fields" }));
        return;
      }

      try {
        const link = await razor.paymentLink.create({
          amount: amount * 100,
          currency: "INR",
          customer: { name, email, contact: phone },
          description: "Appointment Payment",
          notes: { name, email, phone, start },
          callback_url: "https://" + req.headers.host + "/payment-webhook",
          callback_method: "get", // IMPORTANT ✔
        });

        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ pay_url: link.short_url }));
      } catch (err) {
        console.error("Payment Link Error:", err);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: "Payment link creation failed" }));
      }
      return;
    }

    // ====================================================
    // 🔵 PAYMENT WEBHOOK (After payment success)
    // ====================================================
    if (pathname === "/payment-webhook" && req.method === "GET") {
      const urlObj = new URL(req.url, `https://${req.headers.host}`);

      const payment_id = urlObj.searchParams.get("razorpay_payment_id");
      const link_id = urlObj.searchParams.get("razorpay_payment_link_id");

      if (!payment_id || !link_id) {
        res.statusCode = 200;
        res.end("OK");
        return;
      }

      // Fetch payment details from Razorpay
      const payment = await razor.payments.fetch(payment_id);
      const notes = payment.notes;

      const name = notes.name;
      const email = notes.email;
      const phone = notes.phone;
      const start = notes.start;

      // Create the actual Google Calendar event
      const evt = await createEvent({ name, email, phone, start });

      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true, event: evt }));
      return;
    }

    // =======================
    // 404 Fallback
    // =======================
    res.statusCode = 404;
    res.end("Not Found");
  } catch (err) {
    console.error("Handler error:", err);
    res.statusCode = 500;
    res.end("Server Error");
  }
}
