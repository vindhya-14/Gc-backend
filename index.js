import express from "express";
import {
  startAuth,
  handleCallback,
  getFreeBusy,
  createEvent,
} from "./google.js";

const app = express();
app.use(express.json());

// 1) Visit this to start Google OAuth
app.get("/auth", (req, res) => {
  res.redirect(startAuth());
});

// 2) Google OAuth redirect URL
app.get("/oauth/callback", async (req, res) => {
  try {
    await handleCallback(req.query.code);
    res.send("Google Calendar successfully connected! You can close this tab.");
  } catch (err) {
    console.error("OAuth Callback Error:", err);
    res.status(500).send("OAuth error");
  }
});

// 3) Zobot → fetch slots
app.post("/slots", async (req, res) => {
  try {
    const { date } = req.body;
    const slots = await getFreeBusy(date);
    res.json(slots);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching slots");
  }
});

// 4) Zobot → create appointment
app.post("/create", async (req, res) => {
  try {
    const event = await createEvent(req.body);
    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating event");
  }
});

// Run locally
app.listen(3000, () => console.log("Server running on port 3000"));
export default app;
