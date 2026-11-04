import { apiClient } from './apiClient';
import type { ApiResponse } from '../types/common/api';
import type {
    MediaAssetResponse,
    CreateMediaAssetRequest,
    UpdatePrintStatusRequest,
    MediaApprovalRequest,
} from '../types/models/media';

export async function getMediaAssetsByEvent(
    eventId: string,
    assetType?: string,
): Promise<MediaAssetResponse[]> {
    const res = await apiClient.get<ApiResponse<MediaAssetResponse[]>>(
        `/events/${eventId}/media-assets`,
        {
            params: assetType ? { assetType } : undefined,
        },
    );
    return res.data.data;
}

export async function createMediaAsset(
    eventId: string,
    data: CreateMediaAssetRequest,
): Promise<MediaAssetResponse> {
    const res = await apiClient.post<ApiResponse<MediaAssetResponse>>(
        `/events/${eventId}/media-assets`,
        data,
    );
    return res.data.data;
}

export async function getMediaAssetById(assetId: string): Promise<MediaAssetResponse> {
    const res = await apiClient.get<ApiResponse<MediaAssetResponse>>(`/media-assets/${assetId}`);
    return res.data.data;
}

export async function updateMediaPrintStatus(
    assetId: string,
    data: UpdatePrintStatusRequest,
    eventId?: string,
): Promise<MediaAssetResponse> {
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
    const path = eventId
        ? `/events/${eventId}/media-assets/${assetId}/approval`
        : `/media-assets/${assetId}/approval`;
    const res = await apiClient.patch<ApiResponse<MediaAssetResponse>>(path, data);
    return res.data.data;
}
