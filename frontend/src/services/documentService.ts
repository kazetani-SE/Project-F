import { apiClient } from './apiClient';
import type { ApiResponse } from '../types/common/api';
import type {
    DocumentResponse,
    CreateDocumentRequest,
    DocumentApprovalRequest,
} from '../types/models/document';

export async function getDocumentsByEvent(eventId: string): Promise<DocumentResponse[]> {
    const res = await apiClient.get<ApiResponse<DocumentResponse[]>>(`/events/${eventId}/documents`);
    return res.data.data;
}

export async function createDocument(
    eventId: string,
    data: CreateDocumentRequest,
): Promise<DocumentResponse> {
    const res = await apiClient.post<ApiResponse<DocumentResponse>>(
        `/events/${eventId}/documents`,
        data,
    );
    return res.data.data;
}

export async function getDocumentById(documentId: string): Promise<DocumentResponse> {
    const res = await apiClient.get<ApiResponse<DocumentResponse>>(`/documents/${documentId}`);
    return res.data.data;
}

export async function updateDocumentApproval(
    documentId: string,
    data: DocumentApprovalRequest,
    eventId?: string,
): Promise<DocumentResponse> {
    const path = eventId
        ? `/events/${eventId}/documents/${documentId}/approval`
        : `/documents/${documentId}/approval`;
    const res = await apiClient.patch<ApiResponse<DocumentResponse>>(path, data);
    return res.data.data;
}

export async function deleteDocument(
    documentId: string,
    eventId?: string,
): Promise<void> {
    const path = eventId
        ? `/events/${eventId}/documents/${documentId}`
        : `/documents/${documentId}`;
    await apiClient.delete<ApiResponse<null>>(path);
}
