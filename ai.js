export async function symptomCheck(symptoms) {
  const prompt = `
You are a clinical-grade medical triage assistant. Your response must be highly accurate and ALWAYS returned as a STRICT JSON object.
No markdown, no explanations — ONLY the JSON below.

===================================
USER SYMPTOMS
===================================
"${symptoms}"

===================================
REQUIRED JSON OUTPUT
===================================
Return ONLY this structure:

{
  "department": "",
  "expected_doctor": "",
  "severity": "",
  "possible_conditions": [],
  "recommended_action": "",
  "followup_suggestion": "",
  "general_health_tips": []
}

If ANY field is unclear → use these SAFE DEFAULTS:

{
  "department": "General Medicine",
  "expected_doctor": "General Physician",
  "severity": "Mild",
  "possible_conditions": ["General viral illness"],
  "recommended_action": "Monitor symptoms and stay hydrated.",
  "followup_suggestion": "Consult a general physician if symptoms persist.",
  "general_health_tips": [
    "Stay hydrated and get adequate rest.",
    "Avoid stress and heavy physical exertion.",
    "Monitor symptoms regularly and seek help if they worsen."
  ]
}

===================================
DEPARTMENT MAPPING (STRICT)
===================================
• Chest pain, left arm pain, breathing issues, palpitations → Cardiology / Cardiologist  
• Fever, cold, viral symptoms → General Medicine / General Physician  
• Rashes, itching → Dermatology  
• Joint/knee/back pain → Orthopedics  
• Menstrual/pregnancy issues → Gynecology  
• Headache, dizziness, seizures, numbness → Neurology  
• Eye redness, irritation, vision issues → Ophthalmology  
• Anxiety, stress, panic → Psychiatry  
If not clear → General Medicine

===================================
SEVERITY RULES
===================================
Severity MUST be Mild / Moderate / High.

RED-FLAG → ALWAYS "High":
chest pain, breathing difficulty, fainting, severe headache, seizures, sudden vision loss, severe abdominal pain, uncontrolled bleeding.

===================================
POSSIBLE CONDITIONS
===================================
Return 2–5 realistic conditions.

===================================
RECOMMENDED ACTION
===================================
One actionable instruction only.

===================================
FOLLOW-UP SUGGESTION
===================================
Provide one clear next-step.

===================================
GENERAL HEALTH TIPS
===================================
Always include these 3 universal health tips:
[
  "Stay hydrated and get adequate rest.",
  "Avoid stress and heavy physical exertion.",
  "Monitor symptoms and seek help if they worsen."
]

===================================
FINAL INSTRUCTION
===================================
Think internally, but output ONLY the JSON.
`;

  // Call Groq API
  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
  });

  let result = completion.choices[0].message.content;

  /*********************************************
   OPTIONAL SAFETY OVERRIDE (HIGHLY RECOMMENDED)
   Ensures chest pain NEVER goes to General Medicine
  *********************************************/
  try {
    const parsed = JSON.parse(result);
    const lower = symptoms.toLowerCase();

    const redFlags = [
      "chest pain",
      "left arm pain",
      "breath",
      "difficulty breathing",
      "palpit",
      "pressure",
      "severe headache",
      "fainting",
      "seizure",
      "vision loss",
      "severe abdominal",
      "bleeding",
    ];

    const hasRedFlag = redFlags.some((flag) => lower.includes(flag));

    if (hasRedFlag) {
      parsed.department = "Cardiology";
      parsed.expected_doctor = "Cardiologist";
      parsed.severity = "High";
      parsed.recommended_action =
        "Seek immediate emergency medical evaluation.";
      parsed.followup_suggestion =
        "Visit a cardiologist or emergency department right away.";
    }

    // ADD GENERAL HEALTH TIPS ALWAYS (even if AI misses it)
    parsed.general_health_tips = [
      "Stay hydrated and get adequate rest.",
      "Avoid stress and heavy physical exertion.",
      "Monitor symptoms regularly and seek help if they worsen.",
    ];

    result = JSON.stringify(parsed);
  } catch (e) {
    // Fallback JSON if AI output breaks
    result = JSON.stringify({
      department: "General Medicine",
      expected_doctor: "General Physician",
      severity: "Mild",
      possible_conditions: ["General viral illness"],
      recommended_action: "Monitor symptoms and stay hydrated.",
      followup_suggestion: "Consult a general physician if symptoms persist.",
      general_health_tips: [
        "Stay hydrated and get adequate rest.",
        "Avoid stress and heavy physical exertion.",
        "Monitor symptoms regularly and seek help if they worsen.",
      ],
    });
  }

  return result;
}
