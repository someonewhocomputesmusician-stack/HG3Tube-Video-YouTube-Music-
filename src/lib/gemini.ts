import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function generateContentMetadata(title: string, description: string, type: 'video' | 'music') {
  const prompt = `You are a music and video metadata expert for HG3 Tube. 
  Given the following ${type} information:
  Title: ${title}
  Description: ${description}
  
  Generate a JSON object with:
  1. Suggested categories (array)
  2. SEO keywords (array)
  3. A professional marketing description (single string)
  4. Mood/Genre tagging (array)
  
  Return ONLY the JSON object.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (text) {
      return JSON.parse(text);
    }
    return null;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
}
