// index.js (vercel serverless)
import { parse } from "url";
import googleMod from "./google.js";

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

// local uploaded image path (for operator widget use)
const uploadedLogoPath = "/mnt/data/a5d519da-f890-41f5-9998-8a300b55e094.png";

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
    // health
    if (pathname === "/" && req.method === "GET") {
      res.setHeader("Content-Type", "text/plain");
      res.end("Google Calendar Backend Running");
      return;
    }

    // start OAuth
    if (pathname === "/auth" && req.method === "GET") {
      const url = startAuth();
      res.writeHead(302, { Location: url });
      res.end();
      return;
    }

    // OAuth callback
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

    // slots
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

    // create
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

    // list
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

    // update
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

    // delete
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

    // send otp
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

    // verify otp
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

    // Not found
    res.statusCode = 404;
    res.end("Not Found");
  } catch (err) {
    console.error("Handler error:", err);
    res.statusCode = 500;
    res.end("Server Error");
  }
}
