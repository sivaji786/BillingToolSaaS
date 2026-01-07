import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const parseInvoiceWithGemini = async (prompt: string, context: 'create' | 'edit' = 'create') => {
    if (!API_KEY) {
        throw new Error("Missing VITE_GEMINI_API_KEY in .env file");
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    // Using gemini-1.5-flash which supports JSON mode natively
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    const currentDate = new Date().toISOString().split('T')[0];
    const systemPrompt = `
        You are an AI invoice assistant involved in a Billing Application. Your task is to extract invoice data from the user natural language prompt into a structured JSON format.
        
        Current Date: ${currentDate}
        Context: ${context}
        
        Output MUST be a valid JSON object matching this structure:
        {
            "invoiceNumber": "string",
            "issueDate": "YYYY-MM-DD",
            "dueDate": "YYYY-MM-DD or null",
            "currency": "EUR",
            "status": "draft",
            "seller": {
                "name": "string",
                "address": { "street": "string", "city": "string", "postalCode": "string", "country": "DE" },
                "contactEmail": "string", "contactPhone": "string"
            },
            "buyer": {
                "name": "string (extract company/person name carefully)",
                "address": { "street": "string", "city": "string", "postalCode": "string", "country": "DE" },
                "contactEmail": "string", "contactPhone": "string"
            },
            "lines": [
                {
                    "id": "string (generate unique)",
                    "description": "string",
                    "quantity": number,
                    "unitCode": "string (Use UN/ECE codes: 'XPK' for bags, 'EA' for items, 'KGM' for kg, 'LTR' for liters, 'MTR' for meters)",
                    "unitPrice": number,
                    "taxPercent": number,
                    "taxCategory": "S"
                }
            ],
            "note": "string"
        }
        
        IMPORTANT RULES:
        1. Always return VALID JSON.
        2. Extracted money values should be numbers.
        3. Tax Category 'S' stands for Standard rate.
    `;

    const result = await model.generateContent(systemPrompt + "\n\nUser Input: " + prompt);
    return JSON.parse(result.response.text());
};
