export async function symptomCheck(symptoms) {
  const prompt = `
You are a clinical-grade medical triage assistant. Your response must be highly accurate, medically safe, and ALWAYS returned as a STRICT JSON object.
There must be *no* additional text, no markdown, no commentary — ONLY the JSON.

===================================
 USER SYMPTOMS
===================================
"${symptoms}"

===================================
 REQUIRED JSON OUTPUT
===================================
Return ONLY this JSON structure:

{
  "department": "",
  "expected_doctor": "",
  "severity": "",
  "possible_conditions": [],
  "recommended_action": "",
  "followup_suggestion": ""
}

If ANY field is missing, unclear, or cannot be inferred, you MUST substitute a medically safe default value:

{
  "department": "General Medicine",
  "expected_doctor": "General Physician",
  "severity": "Mild",
  "possible_conditions": ["General viral illness"],
  "recommended_action": "Monitor symptoms and stay hydrated.",
  "followup_suggestion": "Consult a general physician if symptoms persist."
}

===================================
 DEPARTMENT + DOCTOR CLASSIFICATION (STRICT RULES)
===================================
Use the following mappings with HIGH PRIORITY:

1. **Cardiology (Red-Flag Priority)**
   Symptoms: chest pain, left arm pain, breathlessness, palpitations, chest pressure
   department: "Cardiology"
   expected_doctor: "Cardiologist"

2. **General Medicine**
   Symptoms: fever, cold, cough, body pain, throat pain, mild viral symptoms
   expected_doctor: "General Physician"

3. **Dermatology**
   Symptoms: rashes, itching, acne, eczema, fungal infection

4. **Orthopedics**
   Symptoms: joint pain, muscle pain, knee pain, fractures, back pain

5. **Gynecology**
   Symptoms: menstrual issues, cramps, pregnancy symptoms, vaginal issues

6. **Neurology**
   Symptoms: headache, migraine, dizziness, seizures, numbness, tingling

7. **Ophthalmology**
   Symptoms: red eyes, blurry vision, irritation, eye discharge

8. **Psychiatry**
   Symptoms: stress, anxiety, panic, depression, insomnia

If the symptoms do not clearly match any category:
department: "General Medicine"
expected_doctor: "General Physician"

===================================
 SEVERITY RULES (STRICT)
===================================
Severity MUST be one of: "Mild", "Moderate", "High".

RED-FLAG SYMPTOMS → ALWAYS "High":
- chest pain  
- difficulty breathing  
- fainting  
- severe headache  
- sudden vision loss  
- seizures  
- uncontrolled bleeding  
- very high fever  
- severe abdominal pain  

===================================
 POSSIBLE CONDITIONS RULES
===================================
Include 2–5 realistic, common conditions. No rare diseases.

===================================
 RECOMMENDED ACTION RULES
===================================
Provide ONE clear actionable instruction, such as:
- "Seek emergency cardiac evaluation."
- "Consult a dermatologist within 24 hours."
- "Monitor symptoms and take rest."

===================================
 FOLLOW-UP SUGGESTION RULES
===================================
Provide one practical advice step, e.g.:
- "Avoid physical exertion."
- "Increase fluids."
- "Visit a specialist if symptoms persist."

===================================
 SAFETY GUARANTEE
===================================
If the model is uncertain OR classification is unclear → return the SAFE DEFAULT JSON exactly as defined.

===================================
 FINAL INSTRUCTION
===================================
Think internally, but output ONLY the final JSON — no explanation, no formatting, no commentary.
  `;

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
  });

  let result = completion.choices[0].message.content;

  /*********************************************
   OPTIONAL: Backend Safety Override (Recommended)
   Ensures chest pain NEVER goes to General Medicine
  *********************************************/
  try {
    const parsed = JSON.parse(result);
    const lower = symptoms.toLowerCase();

    if (
      lower.includes("chest pain") ||
      lower.includes("left arm pain") ||
      lower.includes("breath") ||
      lower.includes("palpit") ||
      lower.includes("pressure")
    ) {
      parsed.department = "Cardiology";
      parsed.expected_doctor = "Cardiologist";
      parsed.severity = "High";
      parsed.recommended_action = "Seek urgent cardiac evaluation.";
      parsed.followup_suggestion =
        "Visit a cardiologist or emergency department immediately.";
      result = JSON.stringify(parsed);
    }
  } catch (e) {
    // If parsing fails, send safe default
    result = JSON.stringify({
      department: "General Medicine",
      expected_doctor: "General Physician",
      severity: "Mild",
      possible_conditions: ["General viral illness"],
      recommended_action: "Monitor symptoms and stay hydrated.",
      followup_suggestion: "Consult a general physician if symptoms persist.",
    });
  }

  return result;
}
