import axios from 'axios';
import { getApiBaseUrl } from '../utils/config';

export interface TicketData {
    subject: string;
    description: string;
    priority: string;
    type?: string;
    screenshot?: string | null;
    domain: string;
    page: string;
    user_id?: string | null;
    attachments?: File[];
}

export interface CreateTicketOptions {
    apiKey: string;
    baseUrl?: string;
}

export const createTicket = async (data: TicketData, options: CreateTicketOptions) => {
    const baseUrl = options.baseUrl || getApiBaseUrl();

    const form = new FormData();
    form.append('subject', data.subject);
    form.append('description', data.description);
    form.append('priority', data.priority);
    if (data.type) form.append('type', data.type);
    form.append('domain', data.domain);
    form.append('page', data.page);
    if (data.user_id) form.append('user_id', data.user_id);
    if (data.screenshot) form.append('screenshot', data.screenshot);

    data.attachments?.forEach((file, i) => {
        form.append(`attachments[${i}]`, file, file.name);
    });

    const response = await axios.post(`${baseUrl}/tickets`, form, {
        headers: { 'X-API-Key': options.apiKey },
    });

    return response.data;
};
