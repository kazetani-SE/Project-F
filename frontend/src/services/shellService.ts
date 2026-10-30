import { apiClient } from './apiClient';
import type {ApiResponse} from "../types/common/api.ts";
import type {EventRole, EventSummary} from "../types/models/event.ts";
import type {AuthUser} from "../types/models/auth.ts";

export const shellService = {
    getMe: async () => (await apiClient.get<ApiResponse<AuthUser>>('/auth/me')).data.data,
    listEvents: async () => (await apiClient.get<ApiResponse<EventSummary[]>>('/events')).data.data,
    fetchRole: async (eventId: string) =>
        (await apiClient.get<ApiResponse<{ role: EventRole | null }>>(`/events/${eventId}/my-role`)).data.data.role,
};