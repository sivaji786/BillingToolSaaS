import OpenAI from "openai";

const ENV_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export const parseInvoiceWithOpenAI = async (prompt: string, context: 'create' | 'edit' = 'create', apiKey?: string) => {
    const activeKey = apiKey || ENV_API_KEY;

    if (!activeKey) {
        throw new Error("Missing OpenAI API Key. Please configure it in Settings.");
    }

    const openai = new OpenAI({
        apiKey: activeKey,
        dangerouslyAllowBrowser: true
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
