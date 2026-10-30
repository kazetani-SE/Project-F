import axios, { AxiosError } from 'axios';
import type {ApiError} from "../types/common/api.ts";

export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
    timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('pf.accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
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