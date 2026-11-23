import { apiClient } from './apiClient.ts';
import type { ApiResponse } from '../types/common/api.ts';
import type {
    DocumentResponse,
    CreateDocumentRequest,
    DocumentApprovalRequest,
    UpdateDocumentFileVersionRequest,
} from '../types/models/document.ts';

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

export function getDocumentsByEvent(eventId: string): Promise<DocumentResponse[]> {
    return dedupeInFlight(`documents:${eventId}`, async () => {
        const res = await apiClient.get<ApiResponse<DocumentResponse[]>>(`/events/${eventId}/documents`);
        return res.data.data;
    });
}

export async function createDocument(
    eventId: string,
    data: CreateDocumentRequest,
): Promise<DocumentResponse> {
    inFlightRequests.delete(`documents:${eventId}`);
    const res = await apiClient.post<ApiResponse<DocumentResponse>>(
        `/events/${eventId}/documents`,
        data,
    );
    return res.data.data;
}

export function getDocumentById(documentId: string): Promise<DocumentResponse> {
    return dedupeInFlight(`document:${documentId}`, async () => {
        const res = await apiClient.get<ApiResponse<DocumentResponse>>(`/documents/${documentId}`);
        return res.data.data;
    });
}

export async function updateDocumentApproval(
    documentId: string,
    data: DocumentApprovalRequest,
    eventId?: string,
): Promise<DocumentResponse> {
    if (eventId) inFlightRequests.delete(`documents:${eventId}`);
    const path = eventId
        ? `/events/${eventId}/documents/${documentId}/approval`
        : `/documents/${documentId}/approval`;
    const res = await apiClient.patch<ApiResponse<DocumentResponse>>(path, data);
    return res.data.data;
}

export async function updateDocumentFileVersion(
    documentId: string,
    data: UpdateDocumentFileVersionRequest,
    eventId?: string,
): Promise<DocumentResponse> {
    if (eventId) inFlightRequests.delete(`documents:${eventId}`);
    const path = eventId
        ? `/events/${eventId}/documents/${documentId}/file-version`
        : `/documents/${documentId}/file-version`;
    const res = await apiClient.patch<ApiResponse<DocumentResponse>>(path, data);
    return res.data.data;
}

export async function deleteDocument(
    documentId: string,
    eventId?: string,
): Promise<void> {
    if (eventId) inFlightRequests.delete(`documents:${eventId}`);
    const path = eventId
        ? `/events/${eventId}/documents/${documentId}`
        : `/documents/${documentId}`;
    await apiClient.delete<ApiResponse<null>>(path);
}
