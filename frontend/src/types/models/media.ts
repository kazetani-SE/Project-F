import type { ApprovalStatus } from './document';

export type MediaAssetType =
    | 'POSTER'
    | 'BANNER'
    | 'STANDEE'
    | 'BACKDROP'
    | 'BADGE'
    | 'TRAILER'
    | 'SOCIAL_POST'
    | 'OTHER';

export interface MediaAssetResponse {
    id: string;
    eventId: string;
    assetType: MediaAssetType;
    title: string;
    specifications: string | null;
    designFileUrl: string | null;
    previewImageUrl: string | null;
    isPrinted: boolean;
    approvalStatus: ApprovalStatus;
    approvedBy: string | null;
    createdAt: string;
}

export interface CreateMediaAssetRequest {
    assetType: MediaAssetType;
    title: string;
    specifications?: string | null;
    designFileUrl?: string | null;
    previewImageUrl?: string | null;
}

export interface UpdatePrintStatusRequest {
    isPrinted: boolean;
}

export interface MediaApprovalRequest {
    approvalStatus: ApprovalStatus;
    approvedBy: string;
}

export const MEDIA_ASSET_TYPE_LABELS: Record<MediaAssetType, string> = {
    POSTER: 'Áp phích (Poster)',
    BANNER: 'Băng rôn (Banner)',
    STANDEE: 'Standee',
    BACKDROP: 'Phông nền (Backdrop)',
    BADGE: 'Thẻ đeo ban tổ chức',
    TRAILER: 'Video Trailer',
    SOCIAL_POST: 'Bài đăng mạng xã hội',
    OTHER: 'Ấn phẩm khác',
};
