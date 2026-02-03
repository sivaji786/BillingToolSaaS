import { GoogleGenerativeAI } from "@google/generative-ai";
import { Invoice } from "../types/invoice";

const ENV_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const parseInvoiceWithGemini = async (prompt: string, context: 'create' | 'edit' = 'create', apiKey?: string, existingInvoice?: Invoice | null, language: string = 'en') => {
    const activeKey = apiKey || ENV_API_KEY;

    if (!activeKey) {
        throw new Error("Missing Gemini API Key. Please configure it in Settings.");
    }

    const genAI = new GoogleGenerativeAI(activeKey);
    // Using gemini-2.5-flash-lite which is the latest and supports JSON mode
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
        generationConfig: { responseMimeType: "application/json" }
    });

    const currentDate = new Date().toISOString().split('T')[0];

    let contextPrompt = "";
    if (context === 'edit' && existingInvoice) {
        contextPrompt = `
        You are in EDIT mode for an existing invoice. 
        Existing Invoice Data: ${JSON.stringify(existingInvoice)}
        
        Your task is to update the fields in this JSON based on the user's instructions. 
        - If the user specifies changes to buyer, seller, or dates, update those fields.
        - If the user specifies adding, removing, or changing line items, update the "lines" array.
        - Preserve all fields that are not explicitly mentioned for change.
        - Ensure totals are NOT required in your output as they are calculated by the backend, but you can provide them if convenient.
        `;
    } else {
        contextPrompt = `
        You are in CREATE mode for a new invoice.
        Extract invoice data from the user natural language prompt.
        `;
    }

    const systemPrompt = `
        You are an AI invoice assistant involved in a Billing Application. Your task is to extract or update invoice data into a structured JSON format.
        
        Current Date: ${currentDate}
        Context: ${context}
        LANGUAGE: ${language}
        ${contextPrompt}
        
        Output MUST be a valid JSON object matching this structure:
        {
            "invoiceNumber": "string",
            "issueDate": "YYYY-MM-DD",
            "dueDate": "YYYY-MM-DD or null",
            "currency": "EUR",
            "status": "draft",
            "seller": {
                "name": "string",
                "address": { "street": "string", "city": "string", "postalCode": "string", "country": "ISO-2 codes like DE, AR, IN" },
                "contactEmail": "string", "contactPhone": "string"
            },
            "buyer": {
                "name": "string",
                "address": { "street": "string", "city": "string", "postalCode": "string", "country": "ISO-2 codes like DE, AR, IN" },
                "contactEmail": "string", "contactPhone": "string"
            },
            "lines": [
                {
                    "id": "string (generate unique)",
                    "description": "string (Extract in user language: ${language})",
                    "quantity": number,
                    "unitCode": "string (Use UN/ECE codes: 'XPK' for bags, 'EA' for items, 'KGM' for kg, 'LTR' for liters, 'MTR' for meters)",
                    "unitPrice": number,
                    "taxPercent": number,
                    "taxCategory": "S"
                }
            ],
            "note": "string (Extract in user language: ${language})"
        }
        
        IMPORTANT RULES:
        1. Always return VALID JSON.
        2. Extracted money values should be numbers.
        3. Tax Category 'S' stands for Standard rate.
        4. If in EDIT mode, merge the changes into the provided JSON structure.
        5. Use user's language (${language}) for descriptions and notes, but JSON keys remain in English.
    `;

    try {
        const result = await model.generateContent(systemPrompt + "\n\nUser Input: " + prompt);
        return JSON.parse(result.response.text());
    } catch (error: any) {
        console.error("Gemini Error:", error);
        throw error;
    }
};
