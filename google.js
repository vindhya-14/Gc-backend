import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

/* --------------------------------------------
   GOOGLE OAUTH CONFIG
--------------------------------------------- */
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URL = process.env.REDIRECT_URL;

/* --------------------------------------------
   SUPABASE CONFIG (ONLY FOR OAUTH TOKEN STORAGE)
--------------------------------------------- */
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/* --------------------------------------------
   EMAIL (ONLY USED FOR APPOINTMENT CONFIRMATION)
--------------------------------------------- */
const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASS = process.env.MAIL_PASS;

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URL) {
  throw new Error("Missing Google OAuth env vars.");
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase configuration.");
}
if (!MAIL_USER || !MAIL_PASS) {
  console.warn(
    "MAIL_USER / MAIL_PASS missing → confirmation emails will fail."
  );
}

// Supabase client (used only for storing OAuth tokens)
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/* --------------------------------------------
   GOOGLE OAUTH CLIENT
--------------------------------------------- */
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URL
);

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

/* --------------------------------------------
   TOKEN STORAGE
--------------------------------------------- */
async function getTokens() {
  const { data } = await supabase
    .from("oauth_tokens")
    .select("*")
    .eq("id", "google_calendar")
    .single();
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

  await supabase.from("oauth_tokens").upsert(row, { returning: "minimal" });
}

/* --------------------------------------------
   OAUTH HELPERS
--------------------------------------------- */
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
    throw new Error("No refresh token stored. Visit /auth first.");
  }

  oauth2Client.setCredentials(stored);

  const isExpired =
    !stored.expiry_date || Number(stored.expiry_date) <= Date.now() + 60000;

  if (isExpired) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    const updated = credentials || {};

    if (!updated.refresh_token) updated.refresh_token = stored.refresh_token;

    await saveTokens(updated);
    oauth2Client.setCredentials(updated);
  }

  return oauth2Client;
}

/* --------------------------------------------
   GET AVAILABLE SLOTS
--------------------------------------------- */
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

  const busy = res?.data?.calendars?.primary?.busy ?? [];

  const slots = [];
  let cursor = new Date(start);

  while (cursor < end) {
    const next = new Date(cursor.getTime() + 30 * 60000);

    const isBusy = busy.some(
      (b) => new Date(b.start) < next && new Date(b.end) > cursor
    );

    if (!isBusy) {
      slots.push({
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

  return {
    date,
    readableDate: new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    isFullyBooked: slots.length === 0,
    totalSlots: slots.length,

    morning: slots
      .filter((s) => s.hour >= 9 && s.hour < 12)
      .map((s) => ({ time: s.label, value: s.iso })),

    afternoon: slots
      .filter((s) => s.hour >= 12 && s.hour < 15)
      .map((s) => ({ time: s.label, value: s.iso })),

    evening: slots
      .filter((s) => s.hour >= 15 && s.hour < 18)
      .map((s) => ({ time: s.label, value: s.iso })),
  };
}

/* --------------------------------------------
   CREATE APPOINTMENT EVENT
--------------------------------------------- */
export async function createEvent({ name, email, phone, start }) {
  const auth = await authorize();
  const calendar = google.calendar({ version: "v3", auth });

  const startDt = new Date(start);
  const endDt = new Date(startDt.getTime() + 30 * 60000); // 30 mins

  const eventBody = {
    summary: `CliniQ Assist – Appointment for ${name}`,
    description: `Patient Name: ${name}\nEmail: ${email}\nPhone: ${phone}`,

    start: { dateTime: startDt.toISOString(), timeZone: "Asia/Kolkata" },
    end: { dateTime: endDt.toISOString(), timeZone: "Asia/Kolkata" },

    // ❌ REMOVE attendees → removes Google invitation email
    // attendees: [{ email, displayName: name }],

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

    // ❗ MOST IMPORTANT — prevents Google sending ANY email
    sendUpdates: "none",

    requestBody: eventBody,
  });

  return created.data;
}

/* --------------------------------------------
   LIST UPCOMING EVENTS FOR USER
--------------------------------------------- */
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

  return (res.data.items || []).map((it) => ({
    id: it.id,
    summary: it.summary,
    start: it.start?.dateTime || it.start?.date || "",
  }));
}

/* --------------------------------------------
   UPDATE (RESCHEDULE)
--------------------------------------------- */
export async function updateEvent(eventId, newStart) {
  const auth = await authorize();
  const calendar = google.calendar({ version: "v3", auth });

  const startDt = new Date(newStart);
  const endDt = new Date(startDt.getTime() + 30 * 60000);

  const updated = await calendar.events.patch({
    calendarId: "primary",
    eventId,
    requestBody: {
      start: { dateTime: startDt.toISOString() },
      end: { dateTime: endDt.toISOString() },
    },
    sendUpdates: "all",
  });

  return updated.data;
}

/* --------------------------------------------
   DELETE APPOINTMENT
--------------------------------------------- */
export async function deleteEvent(eventId) {
  const auth = await authorize();
  const calendar = google.calendar({ version: "v3", auth });

  await calendar.events.delete({
    calendarId: "primary",
    eventId,
    sendUpdates: "all",
  });

  return { success: true };
}

/* --------------------------------------------
   SEND APPOINTMENT CONFIRMATION EMAIL
--------------------------------------------- */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: MAIL_USER, pass: MAIL_PASS },
});

export async function sendConfirmationEmail({ to, name, appointmentId, date }) {
  const html = `
  <h2>Your Appointment is Confirmed!</h2>
  <p>Hello <strong>${name}</strong>,</p>
  <p>Your appointment has been successfully scheduled.</p>
  <ul>
    <li><strong>Appointment ID:</strong> ${appointmentId}</li>
    <li><strong>Date & Time:</strong> ${date}</li>
  </ul>
  <p>Thank you for choosing CliniQ Assist.</p>
  `;

  return await transporter.sendMail({
    from: MAIL_USER,
    to,
    subject: "Your Appointment Confirmation",
    html,
  });
}

/* --------------------------------------------
   EXPORT
--------------------------------------------- */
export default {
  startAuth,
  handleCallback,
  getFreeBusy,
  createEvent,
  listEvents,
  updateEvent,
  deleteEvent,
  sendConfirmationEmail,
};
