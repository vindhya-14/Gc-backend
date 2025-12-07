export async function symptomCheck(symptoms) {
  const prompt = `
You are an advanced medical triage assistant designed for safe and reliable symptom interpretation.  
Your task: analyze the symptoms and return ONLY a STRICT JSON object — no markdown, no explanations.

===================================
 USER SYMPTOMS
===================================
"${symptoms}"

===================================
 REQUIRED OUTPUT FORMAT
===================================
Your output MUST be ONLY this JSON structure:

{
  "department": "",
  "expected_doctor": "",
  "severity": "",
  "possible_conditions": [],
  "recommended_action": "",
  "followup_suggestion": ""
}

If ANY field cannot be determined, provide a safe default:
- "department": "General Medicine"
- "expected_doctor": "General Physician"
- "severity": "Mild"
- "possible_conditions": ["General viral illness"]
- "recommended_action": "Monitor symptoms and stay hydrated."
- "followup_suggestion": "Consult a general physician if symptoms persist."

===================================
 DEPARTMENT & DOCTOR CLASSIFICATION RULES
===================================
Use the following mappings:

• Fever, cold, throat pain, viral symptoms →  
  department: "General Medicine", expected_doctor: "General Physician"

• Chest pain, left arm pain, breathlessness, palpitations →  
  department: "Cardiology", expected_doctor: "Cardiologist"

• Skin rash, itching, eczema, fungal infection →  
  department: "Dermatology", expected_doctor: "Dermatologist"

• Joint pain, knee pain, fractures, back pain →  
  department: "Orthopedics", expected_doctor: "Orthopedic Surgeon"

• Menstrual issues, pregnancy symptoms, vaginal issues →  
  department: "Gynecology", expected_doctor: "Gynecologist"

• Headache, migraine, dizziness, seizures, numbness →  
  department: "Neurology", expected_doctor: "Neurologist"

• Eye redness, irritation, vision changes →  
  department: "Ophthalmology", expected_doctor: "Ophthalmologist"

• Anxiety, panic, depression, stress, insomnia →  
  department: "Psychiatry", expected_doctor: "Psychiatrist"

If symptoms do not clearly match any category:  
department: "General Medicine", expected_doctor: "General Physician"

===================================
 SEVERITY RULES
===================================
Set severity to one of:

• "Mild" → minor discomfort  
• "Moderate" → needs medical evaluation soon  
• "High" → urgent or red-flag symptoms

Red-flag symptoms ALWAYS = "High":
chest pain, difficulty breathing, fainting, severe headache, sudden vision loss, seizures, severe abdominal pain, uncontrolled bleeding, very high fever.

===================================
 POSSIBLE CONDITIONS RULES
===================================
- Provide 2 to 5 realistic likely conditions.  
- Avoid rare diseases.  
- Ensure they match the symptoms.

===================================
 RECOMMENDED ACTION RULES
===================================
Provide ONE clear action, such as:
- "Visit a cardiologist urgently."
- "Consult a dermatologist within 24 hours."
- "Monitor symptoms and rest."

===================================
 FOLLOW-UP SUGGESTION RULES
===================================
Give practical next steps based on the condition, such as:
- "Avoid physical exertion until evaluated."
- "Increase hydration and rest."
- "Seek emergency care if symptoms worsen."

===================================
 FAIL-SAFE REQUIREMENT
===================================
If the model is unsure or output cannot be determined:
Return the SAFE DEFAULT VALUES.

===================================
 FINAL INSTRUCTION
===================================
Think internally, but output ONLY the final JSON object with NO extra text.
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
  });

  return completion.choices[0].message.content;
}
