import { getFreeBusy } from "../lib/google.js";

export default async function handler(req, res) {
  let body = "";
  for await (const chunk of req) body += chunk;
  const data = JSON.parse(body || "{}");

  if (!data.date) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "Missing date" }));
    return;
  }

  const slots = await getFreeBusy(data.date);

  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(slots));
}
