import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config';

async function main() {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    console.log('API KEY START:', apiKey?.substring(0, 7));

    const genAI = new GoogleGenerativeAI(apiKey || '');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    try {
        const result = await model.generateContent("Hello!");
        const response = await result.response;
        console.log('RESPONSE:', response.text());
    } catch (error) {
        console.error('RAW GENERATIVE AI ERROR:', error);
    }
}

main();
