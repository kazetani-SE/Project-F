import { apiClient } from './apiClient.ts';
import type { ApiResponse } from '../types/common/api.ts';
import type {
    IncidentResponse,
    CreateIncidentRequest,
    FaqResponse,
    CreateFaqRequest,
    UpdateFaqPinRequest,
    FeedbackResponse,
    CreateFeedbackRequest,
    FeedbackSummaryResponse,
    FeedbackAiReportResponse,
    GenerateFaqSuggestionsRequest,
    FaqSuggestionsResultResponse,
    DraftIncidentAiRequest,
    DraftIncidentAiResponse,
    KnowledgeChatRequest,
    KnowledgeChatResponse,
} from '../types/models/knowledge.ts';

// In-flight request cache for deduplication
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

// --- Incidents ---
export function getIncidentsByEvent(eventId: string): Promise<IncidentResponse[]> {
    return dedupeInFlight(`incidents:${eventId}`, async () => {
        const res = await apiClient.get<ApiResponse<IncidentResponse[]>>(`/events/${eventId}/incidents`);
        return res.data.data;
    });
}

export async function createIncident(
    eventId: string,
    data: CreateIncidentRequest,
): Promise<IncidentResponse> {
    inFlightRequests.delete(`incidents:${eventId}`);
    const res = await apiClient.post<ApiResponse<IncidentResponse>>(
        `/events/${eventId}/incidents`,
        data,
    );
    return res.data.data;
}

export async function getIncidentById(incidentId: string): Promise<IncidentResponse> {
    return dedupeInFlight(`incident:${incidentId}`, async () => {
        const res = await apiClient.get<ApiResponse<IncidentResponse>>(`/incidents/${incidentId}`);
        return res.data.data;
    });
}

export async function deleteIncident(
    incidentId: string,
    eventId?: string,
): Promise<void> {
    if (eventId) inFlightRequests.delete(`incidents:${eventId}`);
    const path = eventId
        ? `/events/${eventId}/incidents/${incidentId}`
        : `/incidents/${incidentId}`;
    await apiClient.delete<ApiResponse<null>>(path);
}

// --- FAQs ---
export function getFaqsBySeries(
    seriesId: string,
    category?: string,
): Promise<FaqResponse[]> {
    return dedupeInFlight(`faqs:${seriesId}:${category ?? 'ALL'}`, async () => {
        const res = await apiClient.get<ApiResponse<FaqResponse[]>>(
            `/event-series/${seriesId}/faqs`,
            {
                params: category ? { category } : undefined,
            },
        );
        return res.data.data;
    });
}

export async function createFaq(
    seriesId: string,
    data: CreateFaqRequest,
): Promise<FaqResponse> {
    for (const key of inFlightRequests.keys()) {
        if (key.startsWith(`faqs:${seriesId}:`)) {
            inFlightRequests.delete(key);
        }
    }
    const res = await apiClient.post<ApiResponse<FaqResponse>>(
        `/event-series/${seriesId}/faqs`,
        data,
    );
    return res.data.data;
}

export async function createFaqsBatch(
    seriesId: string,
    data: CreateFaqRequest[],
): Promise<FaqResponse[]> {
    if (!data || data.length === 0) return [];
    for (const key of inFlightRequests.keys()) {
        if (key.startsWith(`faqs:${seriesId}:`)) {
            inFlightRequests.delete(key);
        }
    }
    try {
        const res = await apiClient.post<ApiResponse<FaqResponse[]>>(
            `/event-series/${seriesId}/faqs/batch`,
            data,
        );
        return res.data.data;
    } catch {
        // Fallback gọi tuần tự hoặc song song nếu endpoint batch chưa khả dụng
        const created: FaqResponse[] = [];
        for (const item of data) {
            const single = await createFaq(seriesId, item);
            created.push(single);
        }
        return created;
    }
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
export function getFeedbacksByEvent(eventId: string): Promise<FeedbackResponse[]> {
    return dedupeInFlight(`feedbacks:${eventId}`, async () => {
        const res = await apiClient.get<ApiResponse<FeedbackResponse[]>>(`/events/${eventId}/feedbacks`);
        return res.data.data;
    });
}

export function getFeedbackSummaryByEvent(
    eventId: string,
): Promise<FeedbackSummaryResponse> {
    return dedupeInFlight(`feedbacks-summary:${eventId}`, async () => {
        const res = await apiClient.get<ApiResponse<FeedbackSummaryResponse>>(
            `/events/${eventId}/feedbacks/summary`,
        );
        return res.data.data;
    });
}

export async function submitFeedback(
    eventId: string,
    data: CreateFeedbackRequest,
): Promise<FeedbackResponse> {
    inFlightRequests.delete(`feedbacks:${eventId}`);
    inFlightRequests.delete(`feedbacks-summary:${eventId}`);
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
    inFlightRequests.delete(`feedbacks:${eventId}`);
    inFlightRequests.delete(`feedbacks-summary:${eventId}`);
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
    if (eventId) {
        inFlightRequests.delete(`feedbacks:${eventId}`);
        inFlightRequests.delete(`feedbacks-summary:${eventId}`);
    }
    const path = eventId
        ? `/events/${eventId}/feedbacks/${feedbackId}`
        : `/feedbacks/${feedbackId}`;
    await apiClient.delete<ApiResponse<null>>(path);
}

// --- AI Agent & Chatbot APIs ---
export async function getSavedFeedbackAiReport(
    eventId: string,
): Promise<FeedbackAiReportResponse | null> {
    const res = await apiClient.get<ApiResponse<FeedbackAiReportResponse | null>>(
        `/events/${eventId}/feedbacks/ai-report`,
    );
    return res.data.data;
}

export async function generateFeedbackAiReport(
    eventId: string,
): Promise<FeedbackAiReportResponse> {
    const res = await apiClient.post<ApiResponse<FeedbackAiReportResponse>>(
        `/events/${eventId}/feedbacks/ai-report`,
    );
    return res.data.data;
}

export async function suggestFaqsByAi(
    seriesId: string,
    data?: GenerateFaqSuggestionsRequest,
): Promise<FaqSuggestionsResultResponse> {
    const res = await apiClient.post<ApiResponse<FaqSuggestionsResultResponse>>(
        `/event-series/${seriesId}/faqs/ai-suggest`,
        data || {},
    );
    return res.data.data;
}

export async function draftIncidentByAi(
    eventId: string,
    data: DraftIncidentAiRequest,
): Promise<DraftIncidentAiResponse> {
    const res = await apiClient.post<ApiResponse<DraftIncidentAiResponse>>(
        `/events/${eventId}/incidents/ai-draft`,
        data,
    );
    return res.data.data;
}

export async function chatWithKnowledgeAi(
    eventId: string,
    data: KnowledgeChatRequest,
): Promise<KnowledgeChatResponse> {
    const res = await apiClient.post<ApiResponse<KnowledgeChatResponse>>(
        `/events/${eventId}/knowledge/ai-chat`,
        data,
    );
    return res.data.data;
}
