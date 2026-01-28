import { generateText } from 'ai';
import { groq } from '@ai-sdk/groq';
import 'dotenv/config';

async function main() {
    try {
        const { text } = await generateText({
            model: groq('llama-3.3-70b-versatile'),
            prompt: 'Write a professional greeting for a new Vista Auction employee.',
        });

        console.log('--- GROQ AI RESPONSE ---');
        console.log(text);
        console.log('---------------------------');
    } catch (error) {
        console.error('GROQ AI ERROR:', error);
    }
}

main();
