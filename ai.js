import dotenv from "dotenv";
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function symptomCheck(symptoms) {
  const prompt = `
You are a medical triage assistant. analyze symptoms and return a STRICT JSON:

{
  "department": "",
  "severity": "",
  "possible_conditions": [],
  "recommended_action": ""
}

Symptoms: ${symptoms}
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
