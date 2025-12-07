import dotenv from "dotenv";
dotenv.config();

import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function symptomCheck(symptoms) {
 const prompt = `
You are an advanced medical triage AI assistant. Your job is to analyze the user's symptoms and produce a STRICT JSON output with NO extra text. 

Your response must follow this JSON structure EXACTLY:

{
  "department": "",
  "severity": "",
  "possible_conditions": [],
  "recommended_action": "",
  "followup_suggestion": ""
}

==============================
INSTRUCTIONS & CLASSIFICATION RULES
==============================

1️⃣ **DEPARTMENT CLASSIFICATION RULES**
Choose the MOST relevant medical department based on symptoms:

- **Heart/Cardiac Related** → "Cardiology"
   - chest pain, left arm pain, breathlessness, palpitations, dizziness with chest discomfort, heavy chest, sweating with chest pain

- **Cold, Fever, Sore throat, Cough, Flu, Viral, Infection symptoms** → "General Medicine"

- **Skin issues** → "Dermatology"
   - rash, itching, redness, acne, fungal infection, pigmentation, eczema

- **Bones, joints, swelling, injury, pain when moving** → "Orthopedics"

- **Eye symptoms** → "Ophthalmology"
   - redness, burning, blurred vision, irritation, swelling, dryness, discharge

- **Mental health symptoms** → "Psychiatry"
   - stress, anxiety, panic, mood swings, sleep issues, overthinking

- **Women’s health issues** → "Gynecology"
   - period problems, cramps, PCOS symptoms, vaginal discharge, pregnancy concerns

- **Stomach & digestive issues** → "Gastroenterology"
   - acidity, stomach pain, diarrhea, vomiting, constipation, digestion problems

- **Urine-related symptoms** → "Urology"
   - burning urination, frequent urination, lower abdominal pressure, kidney pain

- If no clear classification → choose the **closest matching department**.

2️⃣ **SEVERITY LEVEL RULES**
Severity MUST be one of:
- "mild" → symptoms manageable, no danger signs
- "moderate" → needs attention but not emergency
- "severe" → red flag or potentially dangerous symptoms

Danger signs → automatically **severe**:
- chest pain
- difficulty breathing
- sudden vision loss
- fainting
- severe bleeding
- very high fever
- severe abdominal pain

3️⃣ **POSSIBLE CONDITIONS**
- Return 2–5 most likely conditions.
- Use general medical reasoning.
- Make them realistic but NOT extreme unless symptoms demand it.

4️⃣ **RECOMMENDED ACTION**
Provide clear, simple medical advice:
- Home care steps if mild.
- Visit a doctor if moderate.
- Urgent or emergency care if severe.

5️⃣ **FOLLOW-UP SUGGESTION RULES**
Based on final department:

- **Cardiology** → "Immediate cardiology consultation advised."
- **General Medicine** → "Monitor symptoms and consult a general physician if symptoms persist or worsen."
- **Dermatology** → "Book a dermatologist visit for proper diagnosis and treatment."
- **Orthopedics** → "Follow up with an orthopedic specialist for imaging or physical evaluation."
- **Ophthalmology** → "Get an eye examination from an ophthalmologist."
- **Psychiatry** → "Consider talking to a mental health specialist for proper evaluation."
- **Gynecology** → "Follow up with a gynecologist for a complete assessment."
- **Gastroenterology** → "Consult a gastroenterologist if symptoms continue."
- **Urology** → "Visit a urologist for urine tests and evaluation."
- **Default** → "Consult a doctor for a clinical evaluation."

==============================
STRICT RULES
==============================

- OUTPUT MUST BE VALID JSON ONLY.
- NO markdown, no explanation, no natural language outside JSON.
- Do NOT include backticks.
- Do NOT break JSON.
- No extra fields.
- Think step-by-step internally but output ONLY the final JSON.

Symptoms provided by the user: "${symptoms}"
`;


  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
  });

  return completion.choices[0].message.content;
}
