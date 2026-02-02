import axios from 'axios';
import { getApiBaseUrl } from '../utils/config';

const API_URL = getApiBaseUrl();

export interface SignupData {
    email: string;
    password: string;
    company_name: string;
    plan_id: number;
    name: string;
}

export interface LoginData {
    email: string;
    password: string;
}

export const authService = {
    signup: async (data: SignupData) => {
        const response = await axios.post(`${API_URL}/auth/signup`, data);
        return response.data;
    },

    login: async (data: LoginData) => {
        const response = await axios.post(`${API_URL}/auth/login`, data);
        return response.data;
    },

    logout: async (token: string) => {
        const response = await axios.post(
            `${API_URL}/auth/logout`,
            {},
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        return response.data;
    },

    me: async (token: string) => {
        const response = await axios.get(`${API_URL}/auth/me`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    },

    refresh: async (token: string) => {
        const response = await axios.post(
            `${API_URL}/auth/refresh`,
            {},
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        return response.data;
    },
};
