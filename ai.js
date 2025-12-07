import dotenv from "dotenv";
dotenv.config();

import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function symptomCheck(symptoms) {
  const prompt = `
You are a medical triage assistant. Analyze the user's symptoms and return ONLY a STRICT JSON object:

{
  "department": "",
  "severity": "",
  "possible_conditions": [],
  "recommended_action": ""
}

Symptoms provided: ${symptoms}

Rules:
- No extra text
- No markdown
- No explanations
- Only pure JSON output
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant", // ✅ Updated model
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });

  return completion.choices[0].message.content;
}
