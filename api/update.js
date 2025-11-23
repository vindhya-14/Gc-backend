import { updateEvent } from "../lib/google.js";

export default async function handler(req, res) {
  let body = "";
  for await (const chunk of req) body += chunk;

  const { eventId, start } = JSON.parse(body || "{}");

  if (!eventId || !start) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "Missing fields" }));
    return;
  }

  const evt = await updateEvent(eventId, start);

  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(evt));
}
