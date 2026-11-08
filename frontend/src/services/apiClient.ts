import { useMock } from './supabaseClient';
import axios, { AxiosError } from 'axios';
import type {ApiError} from "../types/common/api.ts";

export const apiClient = axios.create({
    baseURL: useMock ? '/api/v1' : (import.meta.env.VITE_API_BASE_URL ?? '/api/v1'),
    timeout: 15000,
});

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
    accessToken = token;
}

apiClient.interceptors.request.use((config) => {
    if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
    return config;
});

apiClient.interceptors.response.use(
    (res) => res,
    (error: AxiosError<{ message?: string; errorCode?: string }>) =>
        Promise.reject({
            status: error.response?.status,
            errorCode: error.response?.data?.errorCode,
            message: error.response?.data?.message ?? error.message ?? 'Đã có lỗi xảy ra',
        } satisfies ApiError),
);
