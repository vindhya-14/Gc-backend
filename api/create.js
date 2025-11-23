import { createEvent } from "../lib/google.js";

export default async function handler(req, res) {
  let body = "";
  for await (const chunk of req) body += chunk;
  const data = JSON.parse(body || "{}");

  const { name, email, phone, start } = data;

  if (!name || !email || !start) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "Missing fields" }));
    return;
  }

  const evt = await createEvent(data);

  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(evt));
}
