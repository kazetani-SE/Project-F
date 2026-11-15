import { apiClient } from './apiClient';
import type { ApiResponse, PageResponse } from '../types/common/api';
import type { EventFields, EventResponse, EventSeriesDetail, EventSeriesResponse, EventStatus, EventStatusRequest, OrganizerFields, OrganizerResponse, SeriesFields } from '../types/models/event';

interface PageQuery { page: number; size: number }
interface EventQuery extends PageQuery { seriesId?: string; status?: EventStatus }

export const eventService = {
    list: async (params: EventQuery) =>
        (await apiClient.get<ApiResponse<PageResponse<EventResponse>>>('/events', { params })).data.data,
    get: async (id: string) =>
        (await apiClient.get<ApiResponse<EventResponse>>(`/events/${id}`)).data.data,
    create: async (payload: EventFields) =>
        (await apiClient.post<ApiResponse<EventResponse>>('/events', payload)).data.data,
    update: async (id: string, payload: EventFields) =>
        (await apiClient.put<ApiResponse<EventResponse>>(`/events/${id}`, payload)).data.data,
    updateStatus: async (id: string, payload: EventStatusRequest) =>
        (await apiClient.patch<ApiResponse<EventResponse>>(`/events/${id}/status`, payload)).data.data,
    organizers: async (id: string) =>
        (await apiClient.get<ApiResponse<OrganizerResponse[]>>(`/events/${id}/organizers`)).data.data,
    assign: async (id: string, payload: OrganizerFields) =>
        (await apiClient.post<ApiResponse<OrganizerResponse>>(`/events/${id}/organizers`, payload)).data.data,
    remove: async (id: string, memberId: string) => apiClient.delete(`/events/${id}/organizers/${memberId}`),
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
