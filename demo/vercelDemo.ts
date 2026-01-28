import { generateText } from 'ai';
import { vercel } from '@ai-sdk/vercel';
import 'dotenv/config';

async function main() {
    try {
        const { text } = await generateText({
            model: vercel('v0-1.0-md'),
            prompt: 'Write a professional greeting for a new Vista Auction employee.',
        });

        console.log('--- VERCEL AI RESPONSE ---');
        console.log(text);
        console.log('---------------------------');
    } catch (error) {
        console.error('VERCEL AI ERROR:', error);
    }
}

main();
