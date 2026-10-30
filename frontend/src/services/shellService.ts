import { apiClient } from './apiClient';
import type {ApiResponse} from "../types/common/api.ts";
import type {EventRole, EventSummary} from "../types/models/event.ts";
import type {AuthUser} from "../types/models/auth.ts";

export const shellService = {
    getMe: async () => (await apiClient.get<ApiResponse<AuthUser>>('/auth/me')).data.data,
    listEvents: async (): Promise<EventSummary[]> => {
        const response = await apiClient.get<ApiResponse<EventSummary[]>>('/events');
        // HTML từ Vite hoặc response sai hợp đồng không được đưa vào state danh sách.
        if (!Array.isArray(response.data?.data)) {
            throw new Error('API danh sách sự kiện trả sai định dạng. Kiểm tra VITE_USE_MOCK và VITE_API_BASE_URL.');
        }
        return response.data.data;
    },
    fetchRole: async (eventId: string) =>
        (await apiClient.get<ApiResponse<{ role: EventRole | null }>>(`/events/${eventId}/my-role`)).data.data.role,
};
