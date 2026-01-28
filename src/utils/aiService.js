import { generateText, tool } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { supabase } from '../supabaseClient';
import { z } from 'zod';

/**
 * Helper to get a configured Groq model instance.
 * Explicitly passing the API key via createGroq is required for browser compatibility.
 */
const getGroqModel = () => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
        throw new Error("VITE_GROQ_API_KEY_MISSING");
    }
    const groq = createGroq({ apiKey });
    return groq('llama-3.3-70b-versatile');
};

/**
 * Generic AI Response Generator (Used by ResumeParser)
 * Wraps the Groq model for general purpose prompts.
 */
export const generateGroqResponse = async (prompt) => {
    try {
        const { text } = await generateText({
            model: getGroqModel(),
            prompt: prompt,
        });
        return text;
    } catch (error) {
        console.error("AI Generation Error:", error);
        throw error;
    }
};

/**
 * Generates an AI Snapshot (summary) for a candidate application.
 */
export const generateAISnapshot = async (application) => {
    try {
        const prompt = `
            Analyze this job application and provide a 2-sentence professional summary (AI Snapshot).
            Focus on their key strengths and alignment with the role.
            Candidate: ${application.fullName}
            Job: ${application.jobType}
            Preferred Shift: ${application.preferredShift}
            Application Notes: ${application.notes}
            
            Format: Exactly 2 sentences. Professional and insightful.
        `;

        const { text } = await generateText({
            model: getGroqModel(),
            prompt,
        });

        return text.trim();
    } catch (error) {
        console.error("Groq Snapshot Error:", error);
        return "AI analysis unavailable at this time.";
    }
};

/**
 * Analyzes candidate sentiment and assigns a score.
 */
export const analyzeSentiment = async (text) => {
    try {
        const prompt = `
            Analyze the sentiment of the following text from a job applicant. 
            Return ONLY a number between 0.0 (very negative/uninterested) and 1.0 (very positive/highly enthusiastic).
            Text: "${text}"
        `;

        const { text: responseText } = await generateText({
            model: getGroqModel(),
            prompt,
        });

        const score = parseFloat(responseText.trim());
        return isNaN(score) ? 0.5 : score;
    } catch (error) {
        console.error("Groq Sentiment Error:", error);
        return 0.5; // Default to neutral
    }
};

/**
 * Assigns a match ranking (1-10) based on role alignment.
 */
export const calculateMatchRank = async (application) => {
    try {
        const prompt = `
            Rank this candidate's match for the role from 1 to 10 (10 being perfect).
            Return ONLY the number.
            Job Role: ${application.jobType}
            Candidate Info: ${application.notes}
            Resume Experience: ${application.experience || 'Not provided'}
        `;

        const { text: responseText } = await generateText({
            model: getGroqModel(),
            prompt,
        });

        const rank = parseInt(responseText.trim());
        return isNaN(rank) ? 5 : rank;
    } catch (error) {
        console.error("Groq Ranking Error:", error);
        return 0;
    }
};

/**
 * Scans document text for safety risks (PII, Inappropriate Content).
 */
export const scanDocumentSafety = async (text) => {
    try {
        const prompt = `
            Analyze the following resume text for safety risks.
            Check for:
            1. Inappropriate language (Profanity, Hate Speech, Threats).
            2. Excessive PII (Social Security Numbers, Driver License, Bank Accounts).
            3. Suspicious patterns (Malicious code injection attempts).

            Text: "${text.slice(0, 3000)}"

            Return ONLY a valid JSON object:
            {
                "safe": boolean,
                "riskLevel": "Low" | "Medium" | "High",
                "flags": ["list of specific issues found"],
                "reason": "Brief explanation"
            }
        `;

        const { text: responseText } = await generateText({
            model: getGroqModel(),
            prompt,
        });

        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (error) {
        console.error("Safety Scan Error:", error);
        // Fail open (allow upload if AI fails, but warn) or fail closed. 
        // We'll return a neutral response to avoid blocking on AI outage.
        return { safe: true, riskLevel: "Unknown", flags: [], reason: "AI Scan Unavailable" };
    }
};

const APPLICANT_SYSTEM_PROMPT = `
You are the Vista Hiring Scout, a vibrant and supportive AI guide for Vista Auction.
Your goal is to assist applicants and provide them with information about their journey.

TOOLS AVAILABLE:
- use 'findApplicationStatus' to check how a person's application is doing.
- use 'companyFaq' to answer questions about benefits, roles, location, and pay.

CRITICAL INSTRUCTIONS:
- You MUST ALWAYS provide a verbal response to the user.
- After using a tool, read the results and explain them in a friendly, encouraging way.
- Never output raw JSON or just data.
- If you use a tool, you must STILL provide a final chat message summarizing what you found.
`;

const HR_SYSTEM_PROMPT = `
You are the Vista HR Intelligence Core. You are a high-level decision engine for recruitment.
You have tools to query the live candidate database.

CRITICAL INSTRUCTIONS:
- You MUST ALWAYS provide a professional summary of your actions.
- After using a tool, interpret the data for the manager.
- Be analytical, precise, and extremely efficient.
`;

/**
 * Generates a conversational response for the assistants.
 */
export const generateAssistantResponse = async (message, history, role, context = {}) => {
    try {
        const systemPrompt = role === 'hr' ? HR_SYSTEM_PROMPT : APPLICANT_SYSTEM_PROMPT;

        // Format history for Vercel AI SDK
        const messages = history.map(h => ({
            role: h.role === 'model' ? 'assistant' : 'user',
            content: h.parts[0].text
        }));

        const contextString = Object.keys(context).length > 0
            ? `\n\nCURRENT CONTEXT:\n${JSON.stringify(context)}`
            : '';

        const { text } = await generateText({
            model: getGroqModel(),
            system: systemPrompt,
            messages: [
                ...messages,
                { role: 'user', content: `${contextString}\n\nUSER MESSAGE: ${message}` }
            ],
            tools: {
                findApplicationStatus: tool({
                    description: 'Checks the hiring status of a candidate by their full name in the database.',
                    parameters: z.object({
                        fullName: z.string().describe('The full name of the candidate to search for.')
                    }),
                    execute: async ({ fullName }) => {
                        const { data, error } = await supabase
                            .from('vista_applications')
                            .select('status, fullName, position, appliedDate')
                            .ilike('fullName', `%${fullName}%`)
                            .limit(1);

                        if (error) return "ERROR: Database connection failed.";
                        if (!data || data.length === 0) return `NOT_FOUND: No application found for "${fullName}".`;

                        const app = data[0];
                        return `SUCCESS: Found ${app.fullName}. Position: ${app.position}, Status: ${app.status}, Date: ${app.appliedDate}.`;
                    }
                }),
                companyFaq: tool({
                    description: 'Lookup frequently asked questions about Vista benefits, pay, location, and roles.',
                    parameters: z.object({
                        topic: z.enum(['benefits', 'roles', 'location', 'pay']).describe('The topic to lookup information for.')
                    }),
                    execute: async ({ topic }) => {
                        const info = {
                            benefits: "Weekly pay, growth opportunities, collaborative culture, performance rewards.",
                            roles: "Openings for Warehouse Associate, Administrative Support, and Team Leads.",
                            location: "Corporate headquarters and warehouse located in Charlotte, NC.",
                            pay: "Competitive warehouse wages starting at $15-18/hr plus incentives."
                        };
                        return info[topic] || "I don't have that specific data, but I can check with HR for you.";
                    }
                })
            },
            maxSteps: 5,
        });

        // Neural Reliability Guard: Ensure we never return a blank response
        if (!text || text.trim().length === 0) {
            return "I've processed your request. Is there anything else I can help you with?";
        }

        return text.trim();
    } catch (error) {
        console.error("Groq Assistant Error:", error);

        // Detailed error reporting for production debugging
        const errorMsg = error.message || '';
        const status = error.status || (error.cause ? error.cause.status : 'unknown');

        if (errorMsg === "VITE_GROQ_API_KEY_MISSING") {
            return "DEBUG: VITE_GROQ_API_KEY is missing from the environment. Check your Vercel/Vite settings.";
        }
        if (status === 401 || errorMsg.includes('401') || errorMsg.includes('unauthorized')) {
            return `DEBUG [401]: Groq API Key is invalid or unauthorized. (Key Start: ${import.meta.env.VITE_GROQ_API_KEY?.substring(0, 6)}...)`;
        }
        if (status === 429 || errorMsg.includes('429')) {
            return "DEBUG [429]: Groq Rate Limit exceeded. Please wait a moment.";
        }
        if (status === 404 || errorMsg.includes('404')) {
            return `DEBUG [404]: Groq Model not found. Check if 'llama-3.3-70b-versatile' is supported.`;
        }

        return `DEBUG [${status}]: ${errorMsg || 'Unknown connection error.'}. Check browser console for full trace.`;
    }
};
