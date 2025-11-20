import fs from "fs";
import { google } from "googleapis";

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URL = process.env.REDIRECT_URL;

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

const oauth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);

// Load tokens from file
function getTokens() {
  try {
    return JSON.parse(fs.readFileSync("token-store.json"));
  } catch {
    return null;
  }
}

function saveTokens(tokens) {
  fs.writeFileSync("token-store.json", JSON.stringify(tokens));
}

export function startAuth() {
  return oauth.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
}

export async function handleCallback(code) {
  const { tokens } = await oauth.getToken(code);
  saveTokens(tokens);
}

async function authorize() {
  const tokens = getTokens();
  oauth.setCredentials(tokens);

  if (tokens.expiry_date < Date.now()) {
    const newTokens = await oauth.refreshAccessToken();
    saveTokens(newTokens.credentials);
    oauth.setCredentials(newTokens.credentials);
  }

  return oauth;
}

// Fetch free/busy slots
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

  // Generate 30-minute slots
  const slots = [];
  let t = new Date(start);

  while (t < end) {
    const next = new Date(t.getTime() + 30 * 60000);
    const isBusy = busy.some(
      (b) => t >= new Date(b.start) && next <= new Date(b.end)
    );

    if (!isBusy) {
      slots.push(t.toISOString());
    }
    t = next;
  }

  return slots;
}

// Create appointment
export async function createEvent({ name, email, phone, start }) {
  const auth = await authorize();
  const calendar = google.calendar({ version: "v3", auth });

  const event = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: "Doctor Appointment - " + name,
      description: `Email: ${email}\nPhone: ${phone}`,
      start: { dateTime: start },
      end: { dateTime: new Date(new Date(start).getTime() + 30 * 60000) },
    },
  });

  return event.data;
}
