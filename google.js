import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Google OAuth Configuration
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URL = process.env.REDIRECT_URL;

// Supabase Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Mail config
const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASS = process.env.MAIL_PASS;

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URL) {
  throw new Error(
    "Missing Google OAuth env vars (CLIENT_ID/CLIENT_SECRET/REDIRECT_URL)."
  );
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing Supabase env vars (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)."
  );
}
if (!MAIL_USER || !MAIL_PASS) {
  console.warn(
    "MAIL_USER or MAIL_PASS not set - email OTP will fail until configured."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Google OAuth client
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URL
);
const SCOPES = ["https://www.googleapis.com/auth/calendar"];

async function getTokens() {
  const { data, error } = await supabase
    .from("oauth_tokens")
    .select("*")
    .eq("id", "google_calendar")
    .single();
  if (error) return null;
  return data;
}

async function saveTokens(tokens) {
  const row = {
    id: "google_calendar",
    access_token: tokens.access_token || null,
    refresh_token: tokens.refresh_token || null,
    scope: tokens.scope || null,
    token_type: tokens.token_type || null,
    expiry_date: tokens.expiry_date || null,
  };
  const { error } = await supabase
    .from("oauth_tokens")
    .upsert(row, { returning: "minimal" });
  if (error) console.error("Supabase saveTokens error:", error);
}

export function startAuth() {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
}

export async function handleCallback(code) {
  const { tokens } = await oauth2Client.getToken(code);
  await saveTokens(tokens);
}

async function authorize() {
  const stored = await getTokens();
  if (!stored || !stored.refresh_token) {
    throw new Error("No stored refresh token. Authorize via /auth first.");
  }

  oauth2Client.setCredentials({
    access_token: stored.access_token,
    refresh_token: stored.refresh_token,
    scope: stored.scope,
    token_type: stored.token_type,
    expiry_date: stored.expiry_date,
  });

  if (!stored.expiry_date || Number(stored.expiry_date) <= Date.now() + 60000) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    const newTokens = credentials || {};
    if (!newTokens.refresh_token && stored.refresh_token) {
      newTokens.refresh_token = stored.refresh_token;
    }
    await saveTokens(newTokens);
    oauth2Client.setCredentials(newTokens);
  }

  return oauth2Client;
}

// getFreeBusy: returns array of { time: ISOString } for 30-min slots between 09:00-18:00 local
export async function getFreeBusy(date, tzOffset = "+05:30") {
  const auth = await authorize();
  const calendar = google.calendar({ version: "v3", auth });

  const start = new Date(date + "T09:00:00" + tzOffset);
  const end = new Date(date + "T18:00:00" + tzOffset);

  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      items: [{ id: "primary" }],
    },
  });

  const busy = res?.data?.calendars?.primary?.busy
    ? res.data.calendars.primary.busy
    : [];

  const slotList = [];
  let cursor = new Date(start);

  while (cursor < end) {
    const next = new Date(cursor.getTime() + 30 * 60000);

    const conflict = busy.some(
      (b) => new Date(b.start) < next && new Date(b.end) > cursor
    );

    if (!conflict) {
      slotList.push({
        iso: cursor.toISOString(),
        label: cursor.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        hour: cursor.getHours(),
      });
    }

    cursor = next;
  }

  // Group into sessions
  const morning = slotList.filter((s) => s.hour >= 9 && s.hour < 12);
  const afternoon = slotList.filter((s) => s.hour >= 12 && s.hour < 15);
  const evening = slotList.filter((s) => s.hour >= 15 && s.hour < 18);

  return {
    date,
    readableDate: new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    isFullyBooked: slotList.length === 0,
    totalSlots: slotList.length,

    morning: morning.map((s) => ({
      time: s.label,
      value: s.iso,
    })),

    afternoon: afternoon.map((s) => ({
      time: s.label,
      value: s.iso,
    })),

    evening: evening.map((s) => ({
      time: s.label,
      value: s.iso,
    })),
  };
}

export async function createEvent({ name, email, phone, start }) {
  const auth = await authorize();
  const calendar = google.calendar({ version: "v3", auth });

  const startDt = new Date(start);
  const endDt = new Date(startDt.getTime() + 30 * 60000);

  const eventBody = {
    summary: `CliniQ Assist – Appointment for ${name}`,
    description: `
Patient Name: ${name}
Email: ${email}
Phone: ${phone}
Booked via CliniQ Assist.
    `.trim(),

    start: {
      dateTime: startDt.toISOString(),
      timeZone: "Asia/Kolkata",
    },
    end: {
      dateTime: endDt.toISOString(),
      timeZone: "Asia/Kolkata",
    },

    attendees: [
      {
        email: email,
        displayName: name,
      },
    ],

    organizer: {
      email: "vindhya353@gmail.com",
      displayName: "CliniQ Assist",
    },

    creator: {
      email: "vindhya353@gmail.com",
      displayName: "CliniQ Assist",
    },

    reminders: { useDefault: true },
  };

  const created = await calendar.events.insert({
    calendarId: "primary",
    sendUpdates: "all",
    requestBody: eventBody,
  });

  return created.data;
}

// list upcoming events for an email (returns { id, summary, start })
export async function listEvents(email) {
  const auth = await authorize();
  const calendar = google.calendar({ version: "v3", auth });

  const now = new Date().toISOString();
  const res = await calendar.events.list({
    calendarId: "primary",
    q: email,
    singleEvents: true,
    orderBy: "startTime",
    timeMin: now,
    maxResults: 50,
  });

  const items = res.data.items || [];

  return items.map((it) => ({
    id: it.id,
    summary: it.summary,
    start: (it.start && (it.start.dateTime || it.start.date)) || "",
  }));
}

// update (reschedule) event
export async function updateEvent(eventId, newStart) {
  const auth = await authorize();
  const calendar = google.calendar({ version: "v3", auth });

  const startDt = new Date(newStart);
  const endDt = new Date(startDt.getTime() + 30 * 60000);

  const res = await calendar.events.patch({
    calendarId: "primary",
    eventId: eventId,
    requestBody: {
      start: { dateTime: startDt.toISOString() },
      end: { dateTime: endDt.toISOString() },
    },
    sendUpdates: "all",
  });

  return res.data;
}

// delete event
export async function deleteEvent(eventId) {
  const auth = await authorize();
  const calendar = google.calendar({ version: "v3", auth });

  await calendar.events.delete({
    calendarId: "primary",
    eventId: eventId,
    sendUpdates: "all",
  });

  return { success: true };
}

// create transport (Gmail) - uses app password
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: MAIL_USER,
    pass: MAIL_PASS,
  },
});

// store OTP in Supabase table 'otp_store' with primary key email
export async function sendOTP(email) {
  const otp = Math.floor(100000 + Math.random() * 900000);
  const ttl = Date.now() + 5 * 60 * 1000;

  const row = { email: email, otp: otp.toString(), expires_at: ttl };
  const { error } = await supabase
    .from("otp_store")
    .upsert(row, { returning: "minimal" });
  if (error) {
    console.error("Supabase OTP upsert error:", error);
    throw error;
  }

  // send email
  const mailOptions = {
    from: MAIL_USER,
    to: email,
    subject: "Your OTP for Clinic Appointment",
    text: `Your OTP is ${otp}. It expires in 5 minutes.`,
  };

  await transporter.sendMail(mailOptions);
  return { success: true };
}

export async function verifyOTP(email, enteredOtp) {
  const { data, error } = await supabase
    .from("otp_store")
    .select("*")
    .eq("email", email)
    .single();
  if (error || !data) return false;

  const now = Date.now();
  if (Number(data.expires_at) < now) return false;
  return data.otp === String(enteredOtp);
}

export default {
  startAuth,
  handleCallback,
  getFreeBusy,
  createEvent,
  listEvents,
  updateEvent,
  deleteEvent,
  sendOTP,
  verifyOTP,
};
