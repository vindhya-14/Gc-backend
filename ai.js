import dotenv from "dotenv";
dotenv.config();

import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function symptomCheck(symptoms) {
  const prompt = `
You are a highly advanced medical triage assistant. You MUST analyze the user's symptoms deeply and return a STRICT JSON OBJECT with NO extra commentary.

OUTPUT FORMAT (MANDATORY):

{
  "department": "",
  "severity": "",
  "possible_conditions": [],
  "recommended_action": "",
  "follow_up_advice": ""
}

### ANALYSIS RULES

1. **Department Routing (very important)**  
   Choose accurately based on symptoms:  
   - Chest pain, breathlessness → "Cardiology"  
   - Fever, cold, body pain → "General Medicine"  
   - Skin rash, itching → "Dermatology"  
   - Stomach pain, digestion issues → "Gastroenterology"  
   - Anxiety, panic, sleep issues → "Psychiatry"  
   - Child-related → "Pediatrics"  
   - Women reproductive → "Gynecology"  
   - Ear/nose/throat → "ENT"  
   - Bone, joint issues → "Orthopedics"  

2. **Severity Levels (choose one):**  
   - "Mild" → Not urgent  
   - "Moderate" → Should consult soon  
   - "Severe" → Needs immediate medical attention  

3. **Possible Conditions:**  
   Provide **3–6 highly likely medical conditions** based ONLY on symptoms.

4. **Recommended Action:**  
   Clear next step:  
   - Whether to do rest, hydration, medication  
   - Or to consult a specialist  
   - Or seek emergency care  

5. **Follow-up Advice (dynamic):**  
   - If severity = Severe → ask user to seek urgent care  
   - If cardiac → recommend ECG, visit cardiology  
   - If skin → simple home remedies + dermatologist  
   - If general → hydration, paracetamol, rest  
   - If anxiety → grounding techniques + therapy  

### IMPORTANT RULES  
- STRICT JSON ONLY  
- NO markdown  
- NO explanations  
- NO extra words  
- NO line breaks outside JSON  

Symptoms Provided: ${symptoms}
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
  });

  return completion.choices[0].message.content;
}
