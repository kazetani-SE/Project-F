import { apiClient } from './apiClient';
import type { ApiResponse } from '../types/common/api';
import type { AuthUser } from '../types/models/auth';
import type { EventResponse, EventRole, EventSummary, OrganizerRole } from '../types/models/event';
import { eventService } from './eventService';
import { loadPages } from './loadPages';

function toEventSummary(event: EventResponse): EventSummary {
    return {
        id: event.id, seriesId: event.seriesId, name: event.title, seasonLabel: event.seasonName,
        status: event.status, year: Number(event.expectedStartDate.slice(0, 4)),
        startDate: event.expectedStartDate, endDate: event.expectedEndDate, allocatedBudget: event.allocatedFund,
    };
}

export const shellService = {
    getMe: async () => (await apiClient.get<ApiResponse<AuthUser>>('/auth/me')).data.data,
    listEvents: async () => (await loadPages(eventService.list)).map(toEventSummary),
    fetchRole: async (eventId: string) =>
        (await apiClient.get<ApiResponse<{ role: EventRole | OrganizerRole | null }>>(`/events/${eventId}/my-role`)).data.data.role,
};
