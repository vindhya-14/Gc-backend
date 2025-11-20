import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URL = process.env.REDIRECT_URL;

// Supabase Config
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const SCOPES = ["https://www.googleapis.com/auth/calendar"];
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URL
);

// Fetch tokens from Supabase
async function getTokens() {
  const { data, error } = await supabase
    .from("oauth_tokens")
    .select("*")
    .eq("id", "google_calendar")
    .single();

  if (error) return null;
  return data;
}

// Save tokens into Supabase
async function saveTokens(tokens) {
  const row = {
    id: "google_calendar",
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    scope: tokens.scope,
    token_type: tokens.token_type,
    expiry_date: tokens.expiry_date,
  };

  await supabase.from("oauth_tokens").upsert(row);
}

export function startAuth() {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
}

export async function handleCallback(code) {
  const { tokens } = await oauth2Client.getToken(code);
  await saveTokens(tokens);
}

// Refresh if needed
async function authorize() {
  let tokens = await getTokens();
  if (!tokens) throw new Error("No stored tokens. Authenticate first.");

  oauth2Client.setCredentials(tokens);

  if (tokens.expiry_date < Date.now()) {
    const newTokens = await oauth2Client.refreshAccessToken();
    await saveTokens(newTokens.credentials);
    oauth2Client.setCredentials(newTokens.credentials);
  }

  return oauth2Client;
}

export async function getFreeBusy(date) {
  const auth = await authorize();
  const calendar = google.calendar({ version: "v3", auth });

  const start = new Date(date + "T00:00:00+05:30");
  const end = new Date(date + "T23:59:59+05:30");

  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: start,
      timeMax: end,
      items: [{ id: "primary" }],
    },
  });

  const busy = res.data.calendars.primary.busy;
  let t = new Date(date + "T09:00:00+05:30"); // Working hours
  const endTime = new Date(date + "T18:00:00+05:30");

  const slots = [];

  while (t < endTime) {
    const next = new Date(t.getTime() + 30 * 60000);
    const overlapping = busy.some(
      (b) => new Date(b.start) < next && new Date(b.end) > t
    );

    if (!overlapping) slots.push({ time: t.toISOString() });

    t = next;
  }

  return slots;
}

export async function createEvent({ name, email, phone, start }) {
  const auth = await authorize();
  const calendar = google.calendar({ version: "v3", auth });

  const startTime = new Date(start);
  const endTime = new Date(startTime.getTime() + 30 * 60000);

  const event = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: `Doctor Appointment - ${name}`,
      description: `Email: ${email}\nPhone: ${phone}`,
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
    },
  });

  return event.data;
}
