import { apiClient } from './apiClient';
import type { ApiResponse } from '../types/common/api';
import type { AuthUser } from '../types/models/auth';

export const shellService = {
    getMe: async () => (await apiClient.get<ApiResponse<AuthUser>>('/auth/me')).data.data,
};
