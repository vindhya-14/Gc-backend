export async function symptomCheck(symptoms) {
  const prompt = `
You are an advanced medical triage assistant with strong diagnostic reasoning.  
Your ONLY task is to analyze the symptoms and output a STRICT JSON response.

==========================
 USER SYMPTOMS
==========================
"${symptoms}"

==========================
 REQUIRED JSON FORMAT
==========================
The output MUST be EXACTLY in this structure:

{
  "department": "",
  "expected_doctor": "",
  "severity": "",
  "possible_conditions": [],
  "recommended_action": ""
}

NO markdown.  
NO explanation.  
NO text before or after the JSON.  
Only PURE JSON.

==========================
 CLASSIFICATION RULES
==========================

1️⃣ **DEPARTMENT & EXPECTED DOCTOR MAPPING**

- Fever, chills, viral infection, cold, throat pain →  
  department: "General Medicine", expected_doctor: "General Physician"

- Chest pain, left arm pain, breathlessness, palpitations, pressure on chest →  
  department: "Cardiology", expected_doctor: "Cardiologist"

- Skin rash, acne, itching, fungal infection, eczema, allergies →  
  department: "Dermatology", expected_doctor: "Dermatologist"

- Joint pain, knee pain, fractures, muscle injuries, back pain →  
  department: "Orthopedics", expected_doctor: "Orthopedic Surgeon"

- Period issues, cramps, pregnancy symptoms, vaginal concerns →  
  department: "Gynecology", expected_doctor: "Gynecologist"

- Headache, migraine, dizziness, seizures, numbness, tingling →  
  department: "Neurology", expected_doctor: "Neurologist"

- Eye redness, blurred vision, irritation, dryness, discharge →  
  department: "Ophthalmology", expected_doctor: "Ophthalmologist"

- Anxiety, panic, depression, anger, stress, insomnia →  
  department: "Psychiatry", expected_doctor: "Psychiatrist"

- If the symptoms do not clearly fit any category →  
  department: "General Medicine", expected_doctor: "General Physician"

==========================
 SEVERITY RULES
==========================
Severity MUST be one of:

- "Mild" → minor discomfort, manageable symptoms  
- "Moderate" → needs medical review but not urgent  
- "High" → red-flag symptoms or potential emergency

Red-flag symptoms that AUTOMATICALLY mean **High severity**:
- chest pain  
- trouble breathing  
- fainting  
- severe headache  
- sudden vision changes  
- uncontrolled bleeding  
- very high fever  
- seizures  
- severe abdominal pain  

==========================
 POSSIBLE CONDITIONS RULES
==========================
- Must contain **2–5 medically valid** conditions.  
- Keep conditions realistic for the symptoms.  
- Avoid extremely rare diseases.

==========================
 RECOMMENDED ACTION RULES
==========================
Must be **one simple, actionable instruction** such as:
- "Monitor symptoms and stay hydrated."
- "Visit a cardiologist urgently."
- "Use cold compress and consult a dermatologist."
- "Seek immediate medical evaluation."

DO NOT mention the JSON rules or meta-information inside the output.

==========================
 FINAL INSTRUCTION
==========================
Think step-by-step internally, but output ONLY the final JSON.
  `;

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
  });

  return completion.choices[0].message.content;
}
