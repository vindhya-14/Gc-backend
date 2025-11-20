import { parse } from "url";
import {
  startAuth,
  handleCallback,
  getFreeBusy,
  createEvent,
} from "./google.js";

export default async function handler(req, res) {
  const { pathname } = parse(req.url, true);

  try {
    if (pathname === "/") {
      res.statusCode = 200;
      res.end("Google Calendar Backend Running");
      return;
    }

    if (pathname === "/auth") {
      const url = startAuth();
      res.writeHead(302, { Location: url });
      res.end();
      return;
    }

    if (pathname === "/oauth/callback") {
      const urlObj = new URL(req.url, `https://${req.headers.host}`);
      const code = urlObj.searchParams.get("code");

      await handleCallback(code);

      res.end("Authentication Successful! You can close this tab.");
      return;
    }

    if (pathname === "/slots" && req.method === "POST") {
      let body = "";
      for await (const chunk of req) body += chunk;
      const { date } = JSON.parse(body);

      const slots = await getFreeBusy(date);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(slots));
      return;
    }

    if (pathname === "/create" && req.method === "POST") {
      let body = "";
      for await (const chunk of req) body += chunk;
      const inputs = JSON.parse(body);

      const event = await createEvent(inputs);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(event));
      return;
    }

    res.statusCode = 404;
    res.end("Not Found");
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.end("Server Error");
  }
}
