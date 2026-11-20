import { apiClient } from './apiClient.ts';
import type { ApiResponse, PageResponse } from '../types/common/api.ts';
import type { EventFields, EventResponse, EventSeriesDetail, EventSeriesResponse, EventStatus, EventStatusRequest, OrganizerFields, OrganizerResponse, SeriesFields } from '../types/models/event.ts';

interface PageQuery { page: number; size: number }
interface EventQuery extends PageQuery { seriesId?: string; status?: EventStatus }

const inFlightRequests = new Map<string, Promise<unknown>>();

function dedupeInFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = inFlightRequests.get(key);
    if (existing) {
        return existing as Promise<T>;
    }
    const promise = fn().finally(() => {
        inFlightRequests.delete(key);
    });
    inFlightRequests.set(key, promise);
    return promise;
}

export const eventService = {
    list: async (params: EventQuery) =>
        (await apiClient.get<ApiResponse<PageResponse<EventResponse>>>('/events', { params })).data.data,
    get: (id: string) =>
        dedupeInFlight(`event:${id}`, async () =>
            (await apiClient.get<ApiResponse<EventResponse>>(`/events/${id}`)).data.data,
        ),
    create: async (payload: EventFields) =>
        (await apiClient.post<ApiResponse<EventResponse>>('/events', payload)).data.data,
    update: async (id: string, payload: EventFields) => {
        inFlightRequests.delete(`event:${id}`);
        return (await apiClient.put<ApiResponse<EventResponse>>(`/events/${id}`, payload)).data.data;
    },
    updateStatus: async (id: string, payload: EventStatusRequest) => {
        inFlightRequests.delete(`event:${id}`);
        return (await apiClient.patch<ApiResponse<EventResponse>>(`/events/${id}/status`, payload)).data.data;
    },
    organizers: (id: string) =>
        dedupeInFlight(`organizers:${id}`, async () =>
            (await apiClient.get<ApiResponse<OrganizerResponse[]>>(`/events/${id}/organizers`)).data.data,
        ),
    assign: async (id: string, payload: OrganizerFields) => {
        inFlightRequests.delete(`organizers:${id}`);
        return (await apiClient.post<ApiResponse<OrganizerResponse>>(`/events/${id}/organizers`, payload)).data.data;
    },
    updateOrganizer: async (id: string, memberId: string, payload: Omit<OrganizerFields, 'memberId'>) => {
        inFlightRequests.delete(`organizers:${id}`);
        return (await apiClient.put<ApiResponse<OrganizerResponse>>(`/events/${id}/organizers/${memberId}`, payload)).data.data;
    },
    remove: async (id: string, memberId: string) => {
        inFlightRequests.delete(`organizers:${id}`);
        return apiClient.delete(`/events/${id}/organizers/${memberId}`);
    },
};

export const seriesService = {
    list: async (params: PageQuery) =>
        (await apiClient.get<ApiResponse<PageResponse<EventSeriesResponse>>>('/event-series', { params })).data.data,
    get: async (id: string) =>
        (await apiClient.get<ApiResponse<EventSeriesDetail>>(`/event-series/${id}`)).data.data,
    create: async (payload: SeriesFields) =>
        (await apiClient.post<ApiResponse<EventSeriesResponse>>('/event-series', payload)).data.data,
    update: async (id: string, payload: SeriesFields) =>
        (await apiClient.put<ApiResponse<EventSeriesResponse>>(`/event-series/${id}`, payload)).data.data,
};
