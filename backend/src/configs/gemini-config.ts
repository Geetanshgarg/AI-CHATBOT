import { GoogleGenerativeAI } from "@google/generative-ai";

export const configureGemini = () => {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    return genAI;
}