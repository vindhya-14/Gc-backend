import dotenv from "dotenv";
dotenv.config();

import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function symptomCheck(symptoms) {
  const prompt = `
You are a medical triage assistant. Analyze the user's symptoms and return ONLY a STRICT JSON:

{
  "department": "",
  "severity": "",
  "possible_conditions": [],
  "recommended_action": "",
  "followup_suggestion": ""
}

Rules:
- Output only JSON
- No quotes outside JSON
- No descriptions or explanations

Now analyze:
"${symptoms}"

DEPARTMENT RULES:
- Heart-related → "Cardiology"
- Chest pain / breathlessness → "Cardiology"
- Women symptoms → "Gynecology"
- Child symptoms → "Pediatrics"
- Skin → "Dermatology"
- Bones → "Orthopedics"
- Fever, headache, cold, viral → "General Medicine"
- Stress, anxiety → "Psychiatry"
- Eye issues → "Ophthalmology"

FOLLOWUP SUGGESTION RULES:
- If Cardiology → "You should consult a cardiologist as soon as possible."
- If General Medicine → "A general physician can evaluate and guide you further."
- If Dermatology → "A dermatologist can help diagnose the skin issue."
- If Gynecology → "A gynecologist consultation is recommended."
- If ENT → "Meeting an ENT specialist is advisable."
- If Orthopedics → "You may need to see an orthopedic doctor."
- Default → "Please consult a qualified doctor for a detailed check-up."
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
  });

  return completion.choices[0].message.content;
}
