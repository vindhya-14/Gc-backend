// index.js (vercel serverless)
import { parse } from "url";
import googleMod from "./google.js";

// Razorpay handlers
import createOrderHandler from "./routes/create-order.js";
import verifyPaymentHandler from "./routes/verify-payment.js";

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

// helper: read JSON body
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
    // Slots
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
    // Create (Calendar)
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

      const ok = await verifyOTP(email);

      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ valid: ok }));
      return;
    }

    // =====================================================
    // 🔥 NEW: RAZORPAY INTEGRATION ROUTES
    // =====================================================

    // Create Order
    if (pathname === "/create-order" && req.method === "POST") {
      return createOrderHandler(req, res);
    }

    // Verify Payment (and create event)
    if (pathname === "/verify-payment" && req.method === "POST") {
      return verifyPaymentHandler(req, res);
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
