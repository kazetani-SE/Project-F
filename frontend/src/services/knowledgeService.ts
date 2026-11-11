import { apiClient } from './apiClient';
import type { ApiResponse } from '../types/common/api';
import type {
    IncidentResponse,
    CreateIncidentRequest,
    FaqResponse,
    CreateFaqRequest,
    UpdateFaqPinRequest,
    FeedbackResponse,
    CreateFeedbackRequest,
    FeedbackSummaryResponse,
} from '../types/models/knowledge';

// --- Incidents ---
export async function getIncidentsByEvent(eventId: string): Promise<IncidentResponse[]> {
    const res = await apiClient.get<ApiResponse<IncidentResponse[]>>(`/events/${eventId}/incidents`);
    return res.data.data;
}

export async function createIncident(
    eventId: string,
    data: CreateIncidentRequest,
): Promise<IncidentResponse> {
    const res = await apiClient.post<ApiResponse<IncidentResponse>>(
        `/events/${eventId}/incidents`,
        data,
    );
    return res.data.data;
}

export async function getIncidentById(incidentId: string): Promise<IncidentResponse> {
    const res = await apiClient.get<ApiResponse<IncidentResponse>>(`/incidents/${incidentId}`);
    return res.data.data;
}

export async function deleteIncident(
    incidentId: string,
    eventId?: string,
): Promise<void> {
    const path = eventId
        ? `/events/${eventId}/incidents/${incidentId}`
        : `/incidents/${incidentId}`;
    await apiClient.delete<ApiResponse<null>>(path);
}

// --- FAQs ---
export async function getFaqsBySeries(
    seriesId: string,
    category?: string,
): Promise<FaqResponse[]> {
    const res = await apiClient.get<ApiResponse<FaqResponse[]>>(
        `/event-series/${seriesId}/faqs`,
        {
            params: category ? { category } : undefined,
        },
    );
    return res.data.data;
}

export async function createFaq(
    seriesId: string,
    data: CreateFaqRequest,
): Promise<FaqResponse> {
    const res = await apiClient.post<ApiResponse<FaqResponse>>(
        `/event-series/${seriesId}/faqs`,
        data,
    );
    return res.data.data;
}

export async function updateFaqPin(
    faqId: string,
    data: UpdateFaqPinRequest,
    seriesId?: string,
): Promise<FaqResponse> {
    const path = seriesId
        ? `/event-series/${seriesId}/faqs/${faqId}/pin`
        : `/faqs/${faqId}/pin`;
    const res = await apiClient.patch<ApiResponse<FaqResponse>>(path, data);
    return res.data.data;
}

export async function deleteFaq(
    faqId: string,
    seriesId?: string,
): Promise<void> {
    const path = seriesId
        ? `/event-series/${seriesId}/faqs/${faqId}`
        : `/faqs/${faqId}`;
    await apiClient.delete<ApiResponse<null>>(path);
}

// --- Feedbacks ---
export async function getFeedbacksByEvent(eventId: string): Promise<FeedbackResponse[]> {
    const res = await apiClient.get<ApiResponse<FeedbackResponse[]>>(`/events/${eventId}/feedbacks`);
    return res.data.data;
}

export async function getFeedbackSummaryByEvent(
    eventId: string,
): Promise<FeedbackSummaryResponse> {
    const res = await apiClient.get<ApiResponse<FeedbackSummaryResponse>>(
        `/events/${eventId}/feedbacks/summary`,
    );
    return res.data.data;
}

export async function submitFeedback(
    eventId: string,
    data: CreateFeedbackRequest,
): Promise<FeedbackResponse> {
    const res = await apiClient.post<ApiResponse<FeedbackResponse>>(
        `/events/${eventId}/feedbacks`,
        data,
    );
    return res.data.data;
}

export async function submitFeedbacksBatch(
    eventId: string,
    data: CreateFeedbackRequest[],
): Promise<FeedbackResponse[]> {
    const res = await apiClient.post<ApiResponse<FeedbackResponse[]>>(
        `/events/${eventId}/feedbacks/batch`,
        data,
    );
    return res.data.data;
}

export async function deleteFeedback(
    feedbackId: string,
    eventId?: string,
): Promise<void> {
    const path = eventId
        ? `/events/${eventId}/feedbacks/${feedbackId}`
        : `/feedbacks/${feedbackId}`;
    await apiClient.delete<ApiResponse<null>>(path);
}
