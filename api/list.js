import { listEvents } from "../lib/google.js";

export default async function handler(req, res) {
  let body = "";
  for await (const chunk of req) body += chunk;
  const data = JSON.parse(body || "{}");

  if (!data.email) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "Missing email" }));
    return;
  }

  const items = await listEvents(data.email);

  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(items));
}
