import * as pdfjsLib from 'pdfjs-dist';
import { generateGroqResponse } from './aiService';

// Set worker source for PDF.js (Critical for Vite/React)
// We use the LOCAL copy of the worker we just moved to public/
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

/**
 * Extracts raw text from a PDF file
 * @param {File} file - The PDF file object
 * @returns {Promise<string>} - The extracted text
 */
const extractTextFromPDF = async (file) => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }

        return fullText;
    } catch (error) {
        console.error('PDF Text Extraction Failed:', error);
        throw new Error('Failed to read PDF file. Please ensure it contains text.');
    }
};

/**
 * Parses a resume file (PDF/Text) into structured data
 * @param {File} file 
 * @returns {Promise<Object>} - Structured candidate data
 */
export const parseResume = async (file) => {
    try {
        let rawText = '';

        if (file.type === 'application/pdf') {
            rawText = await extractTextFromPDF(file);
        } else if (file.type === 'text/plain') {
            rawText = await file.text();
        } else {
            throw new Error('Unsupported file type. Please upload a PDF or TXT file.');
        }

        if (!rawText || rawText.length < 50) {
            throw new Error('Resume text is too short or unreadable.');
        }

        console.log("Parser: Extracted text length:", rawText.length);

        // AI Parsing Prompt (Optimized for Groq Llama 3)
        const prompt = `
            EXTRACT JSON FROM RESUME.
            
            Resume Text:
            "${rawText.slice(0, 12000)}"

            INSTRUCTIONS:
            1. Extract the candidate's details into the keys below.
            2. If a field is missing, use null.
            3. "experience_years" must be a number (e.g. 5, not "5 years").
            4. "skills" must be an array of strings.
            5. "summary" should be a 2-sentence professional bio.
            
            REQUIRED JSON STRUCTURE:
            {
                "fullName": "First Last",
                "email": "email@example.com",
                "phone": "123-456-7890",
                "experience_years": 0,
                "skills": ["Skill1", "Skill2"],
                "last_job_title": "Title",
                "summary": "Bio..."
            }

            RETURN ONLY RAW JSON. NO MARKDOWN. NO COMMENTS.
        `;

        console.log("Parser: Initiating AI analysis...");
        const jsonResponse = await generateGroqResponse(prompt);
        console.log("Parser: AI processing complete.");

        // Clean up response if AI adds markdown
        let cleanedJson = jsonResponse.replace(/```json/g, '').replace(/```/g, '').trim();

        // Remove conversational prefixes
        const firstBrace = cleanedJson.indexOf('{');
        const lastBrace = cleanedJson.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanedJson = cleanedJson.substring(firstBrace, lastBrace + 1);
        }

        return JSON.parse(cleanedJson);

    } catch (error) {
        console.error('Resume Parsing Error:', error);
        throw error;
    }
};
