import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import 'dotenv/config';

async function main() {
    const { text } = await generateText({
        model: google('gemini-pro'),
        prompt: 'Write a professional greeting for a new Vista Auction employee.',
    });

    console.log('--- AI RESPONSE ---');
    console.log(text);
    console.log('-------------------');
}

main().catch(console.error);
