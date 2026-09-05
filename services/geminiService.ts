
import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.API_KEY || process.env.GEMINI_API_KEY || "";
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

export class GeminiService {
  /**
   * General purpose analysis for the wallet data.
   */
  async analyzeFinances(data: any): Promise<string> {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze this user's wallet data and provide a short, encouraging summary in Bengali: ${JSON.stringify(data)}`,
    });
    return response.text || "ডেটা বিশ্লেষণ করা সম্ভব হয়নি।";
  }

  /**
   * Refines or merges code snippets as requested by the user.
   */
  async refineCode(snippetA: string, snippetB: string, instruction: string): Promise<any> {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Merge/Edit these codes based on: ${instruction}\n\nCode A:\n${snippetA}\n\nCode B:\n${snippetB}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            refinedCode: { type: Type.STRING },
            explanation: { type: Type.STRING },
            changes: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["refinedCode", "explanation", "changes"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  }
}

export const geminiService = new GeminiService();
