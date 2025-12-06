import { parse } from "url";
import Razorpay from "razorpay";
import dotenv from "dotenv";
dotenv.config();

// Google Calendar module
import googleMod from "./google.js";
const {
  startAuth,
  handleCallback,
  getFreeBusy,
  createEvent,
  listEvents,
  updateEvent,
  deleteEvent,
} = googleMod;

// Phone OTP + Email
import { sendOTP, verifyOTP } from "./otp.js";
import { sendConfirmationEmail } from "./sendEmail.js";

// Helper: read JSON body
async function readBody(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
}

// Razorpay instance
const razor = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export default async function handler(req, res) {
  const { pathname } = parse(req.url, true);

  try {
    /********************************************
     HEALTH CHECK
    ********************************************/
    if (pathname === "/" && req.method === "GET") {
      res.setHeader("Content-Type", "text/plain");
      res.end("CliniQ Assist Backend Running");
      return;
    }

    /********************************************
     GOOGLE OAUTH START
    ********************************************/
    if (pathname === "/auth" && req.method === "GET") {
      const url = startAuth();
      res.writeHead(302, { Location: url });
      res.end();
      return;
    }

    /********************************************
     GOOGLE OAUTH CALLBACK
    ********************************************/
    if (pathname === "/oauth/callback" && req.method === "GET") {
      const redirectUrl = new URL(req.url, `https://${req.headers.host}`);
      const code = redirectUrl.searchParams.get("code");

      if (!code) {
        res.statusCode = 400;
        res.end("Missing Google OAuth code");
        return;
      }

      await handleCallback(code);

      res.setHeader("Content-Type", "text/html");
      res.end(
        "<h3>Google Authentication Successful! You can close this window.</h3>"
      );
      return;
    }

    /********************************************
     GET AVAILABLE SLOTS
    ********************************************/
    if (pathname === "/slots" && req.method === "POST") {
      const { date } = await readBody(req);

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

    /********************************************
     CREATE APPOINTMENT (GOOGLE CALENDAR)
    ********************************************/
    if (pathname === "/create" && req.method === "POST") {
      const { name, email, phone, start } = await readBody(req);

      if (!name || !email || !start) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Missing required fields" }));
        return;
      }

      const evt = await createEvent({ name, email, phone, start });

      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(evt));
      return;
    }

    /********************************************
     LIST APPOINTMENTS (EMAIL)
    ********************************************/
    if (pathname === "/list" && req.method === "POST") {
      const { email } = await readBody(req);

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

    /********************************************
     UPDATE EVENT (RESCHEDULE)
    ********************************************/
    if (pathname === "/update" && req.method === "POST") {
      const { eventId, start } = await readBody(req);

      if (!eventId || !start) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Missing eventId or start" }));
        return;
      }

      const updated = await updateEvent(eventId, start);

      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(updated));
      return;
    }

    /********************************************
     DELETE EVENT (CANCEL)
    ********************************************/
    if (pathname === "/delete" && req.method === "POST") {
      const { eventId } = await readBody(req);

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

    /********************************************
     SEND OTP (PHONE ONLY)
    ********************************************/
    if (pathname === "/send-otp" && req.method === "POST") {
      const { phone } = await readBody(req);

      if (!phone) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Missing phone" }));
        return;
      }

      try {
        await sendOTP(phone);

        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        console.error("OTP Error:", err);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: "Failed to send OTP" }));
      }
      return;
    }

    /********************************************
     VERIFY OTP (PHONE ONLY)
    ********************************************/
    if (pathname === "/verify-otp" && req.method === "POST") {
      const { phone, otp } = await readBody(req);

      if (!phone || !otp) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Missing phone or otp" }));
        return;
      }

      try {
        const valid = await verifyOTP(phone, otp);

        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ valid }));
      } catch (err) {
        console.error("OTP Verify Error:", err);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: "OTP verification failed" }));
      }
      return;
    }

    /********************************************
     CREATE PAYMENT LINK (RAZORPAY)
    ********************************************/
    if (pathname === "/create-payment-link" && req.method === "POST") {
      const { name, email, phone, amount, start } = await readBody(req);

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
          callback_url: `https://${req.headers.host}/payment-webhook`,
          callback_method: "get",
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

    /********************************************
     PAYMENT WEBHOOK → CREATE EVENT + SEND EMAIL
    ********************************************/
    if (pathname === "/payment-webhook" && req.method === "GET") {
      const urlObj = new URL(req.url, `https://${req.headers.host}`);

      const payment_id = urlObj.searchParams.get("razorpay_payment_id");
      const link_id = urlObj.searchParams.get("razorpay_payment_link_id");

      // Razorpay returns empty requests while verifying link
      if (!payment_id || !link_id) {
        res.statusCode = 200;
        res.end("OK");
        return;
      }

      // Fetch payment details
      const payment = await razor.payments.fetch(payment_id);
      const notes = payment.notes;

      const name = notes.name;
      const email = notes.email;
      const phone = notes.phone;
      const start = notes.start;

      // Create Google Calendar event
      const evt = await createEvent({ name, email, phone, start });

      // Email confirmation
      await sendConfirmationEmail({
        to: email,
        name,
        appointmentId: evt.id,
        date: start,
      });

      // Redirect to thank-you page
      res.writeHead(302, {
        Location: `https://${req.headers.host}/thank-you`,
      });
      res.end();
      return;
    }

    /********************************************
     FALLBACK
    ********************************************/
    res.statusCode = 404;
    res.end("Not Found");
  } catch (err) {
    console.error("Handler Internal Error:", err);
    res.statusCode = 500;
    res.end("Server Error");
  }
}
