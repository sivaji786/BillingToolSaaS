import axios from 'axios';

export interface TicketData {
    subject: string;
    description: string;
    priority: string;
    screenshot?: string | null;
    domain: string;
    page: string;
    user_id?: string | null;
}

export interface CreateTicketOptions {
    apiKey: string;
    baseUrl?: string;
}

export const createTicket = async (data: TicketData, options: CreateTicketOptions) => {
    const baseUrl = options.baseUrl || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

    const response = await axios.post(`${baseUrl}/tickets`, data, {
        headers: {
            'X-API-Key': options.apiKey,
            'Content-Type': 'application/json'
        }
    });

    return response.data;
};
