import { deleteEvent } from "../lib/google.js";

export default async function handler(req, res) {
  let body = "";
  for await (const chunk of req) body += chunk;

  const { eventId } = JSON.parse(body || "{}");

  if (!eventId) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "Missing eventId" }));
    return;
  }

  const result = await deleteEvent(eventId);

  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(result));
}
