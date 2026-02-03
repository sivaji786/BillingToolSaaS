import OpenAI from "openai";
import { Invoice } from "../types/invoice";

const ENV_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export const parseInvoiceWithOpenAI = async (
    prompt: string,
    context: 'create' | 'edit' = 'create',
    apiKey?: string,
    existingInvoice?: Invoice | null,
    language: string = 'en'
) => {
    const activeKey = apiKey || ENV_API_KEY;

    if (!activeKey) {
        throw new Error("Missing OpenAI API Key. Please configure it in Settings.");
    }

    const openai = new OpenAI({
        apiKey: activeKey,
        dangerouslyAllowBrowser: true
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
        `;
    } else {
        contextPrompt = `
        You are in CREATE mode for a new invoice.
        Extract invoice data from the user natural language prompt.
        `;
    }

    const systemPrompt = `
        You are an AI invoice assistant in a Billing Application.
        CURRENT LANGUAGE: ${language}
        
        Task: Extract or update invoice data into a structured JSON format.
        
        Current Date: ${currentDate}
        Context: ${context}
        ${contextPrompt}
        
        IMPORTANT RULES:
        1. Always return VALID JSON.
        2. Extracted money values should be numbers.
        3. Tax Category 'S' stands for Standard rate.
        4. If in EDIT mode, merge the changes into the provided JSON structure.
        5. LANGUAGE: The user is speaking ${language}. 
           - Extract item descriptions, names, and notes in the user's language (${language}).
           - However, the JSON KEYS must remain in English as defined below.
           - For country codes, always use ISO-2 mapping (e.g., DE, IN, AR).
        
        Output Structure:
        {
            "invoiceNumber": "string",
            "issueDate": "YYYY-MM-DD",
            "dueDate": "YYYY-MM-DD or null",
            "currency": "EUR",
            "status": "draft",
            "seller": {
                "name": "string",
                "address": { "street": "string", "city": "string", "postalCode": "string", "country": "ISO-2" },
                "contactEmail": "string", "contactPhone": "string"
            },
            "buyer": {
                "name": "string",
                "address": { "street": "string", "city": "string", "postalCode": "string", "country": "ISO-2" },
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
    `;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" }
        });

        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error("Empty response from OpenAI");
        }

        return JSON.parse(content);
    } catch (error: any) {
        if (error?.status === 429) {
            throw new Error("OpenAI Rate Limit Exceeded: This usually means you need to add credits (separate from ChatGPT Plus) or wait a few minutes.");
        }
        throw error;
    }
};
