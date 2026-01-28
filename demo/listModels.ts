import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config';

async function main() {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');
    try {
        const models = await genAI.listModels();
        console.log('--- MODELS ---');
        console.log(JSON.stringify(models, null, 2));
        console.log('--------------');
    } catch (error) {
        console.error('FAILED TO LIST MODELS:', error);
    }
}

main();
