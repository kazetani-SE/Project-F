import { apiClient } from './apiClient.ts';
import type { ApiResponse } from '../types/common/api.ts';
import type {
    MediaAssetResponse,
    CreateMediaAssetRequest,
    UpdatePrintStatusRequest,
    MediaApprovalRequest,
} from '../types/models/media.ts';

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

function clearEventMediaInFlight(eventId?: string) {
    if (!eventId) return;
    for (const key of inFlightRequests.keys()) {
        if (key.startsWith(`media:${eventId}:`)) {
            inFlightRequests.delete(key);
        }
    }
}

export function getMediaAssetsByEvent(
    eventId: string,
    assetType?: string,
): Promise<MediaAssetResponse[]> {
    return dedupeInFlight(`media:${eventId}:${assetType ?? 'ALL'}`, async () => {
        const res = await apiClient.get<ApiResponse<MediaAssetResponse[]>>(
            `/events/${eventId}/media-assets`,
            {
                params: assetType ? { assetType } : undefined,
            },
        );
        return res.data.data;
    });
}

export async function createMediaAsset(
    eventId: string,
    data: CreateMediaAssetRequest,
): Promise<MediaAssetResponse> {
    clearEventMediaInFlight(eventId);
    const res = await apiClient.post<ApiResponse<MediaAssetResponse>>(
        `/events/${eventId}/media-assets`,
        data,
    );
    return res.data.data;
}

export async function updateMediaAsset(
    assetId: string,
    data: CreateMediaAssetRequest,
    eventId?: string,
): Promise<MediaAssetResponse> {
    clearEventMediaInFlight(eventId);
    const path = eventId
        ? `/events/${eventId}/media-assets/${assetId}`
        : `/media-assets/${assetId}`;
    const res = await apiClient.put<ApiResponse<MediaAssetResponse>>(path, data);
    return res.data.data;
}

export function getMediaAssetById(assetId: string): Promise<MediaAssetResponse> {
    return dedupeInFlight(`media-asset:${assetId}`, async () => {
        const res = await apiClient.get<ApiResponse<MediaAssetResponse>>(`/media-assets/${assetId}`);
        return res.data.data;
    });
}

export async function updateMediaPrintStatus(
    assetId: string,
    data: UpdatePrintStatusRequest,
    eventId?: string,
): Promise<MediaAssetResponse> {
    clearEventMediaInFlight(eventId);
    const path = eventId
        ? `/events/${eventId}/media-assets/${assetId}/print-status`
        : `/media-assets/${assetId}/print-status`;
    const res = await apiClient.patch<ApiResponse<MediaAssetResponse>>(path, data);
    return res.data.data;
}

export async function updateMediaApproval(
    assetId: string,
    data: MediaApprovalRequest,
    eventId?: string,
): Promise<MediaAssetResponse> {
    clearEventMediaInFlight(eventId);
    const path = eventId
        ? `/events/${eventId}/media-assets/${assetId}/approval`
        : `/media-assets/${assetId}/approval`;
    const res = await apiClient.patch<ApiResponse<MediaAssetResponse>>(path, data);
    return res.data.data;
}

export async function deleteMediaAsset(
    assetId: string,
    eventId?: string,
): Promise<void> {
    clearEventMediaInFlight(eventId);
    const path = eventId
        ? `/events/${eventId}/media-assets/${assetId}`
        : `/media-assets/${assetId}`;
    await apiClient.delete<ApiResponse<null>>(path);
}
