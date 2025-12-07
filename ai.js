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

Make sure:
- No explanations
- No extra text
- No markdown
- Only pure JSON
`;

  const completion = await groq.chat.completions.create({
    model: "llama3-8b-8192", // FREE + Recommended
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  return completion.choices[0].message.content;
}
