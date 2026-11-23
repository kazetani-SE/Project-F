export type StorageCategory = 'RECEIPT' | 'DOCUMENT' | 'MEDIA' | 'FEEDBACK';

export interface PresignedUploadRequest {
    fileName: string;
    mimeType: string;
    fileSize: number;
    category: StorageCategory;
    targetObjectKey?: string | null;
}

export interface PresignedUploadResponse {
    uploadUrl: string;
    fileUrl: string;
    objectKey: string;
    expiresInMinutes: number;
}

export interface PresignedDownloadResponse {
    downloadUrl: string;
    objectKey: string;
    expiresInMinutes: number;
}

export interface S3ObjectVersionResponse {
    objectKey: string;
    versionId: string;
    isLatest: boolean;
    sizeBytes: number;
    lastModified: string;
    eTag: string | null;
    fileUrl: string;
}

export interface UploadedFileResult {
    fileUrl: string;
    objectKey: string;
    versionId?: string | null;
    fileName: string;
    fileSize: number;
    mimeType: string;
}

export const STORAGE_LIMITS: Record<StorageCategory, number> = {
    RECEIPT: 15 * 1024 * 1024,   // 15 MB
    DOCUMENT: 50 * 1024 * 1024,  // 50 MB
    MEDIA: 100 * 1024 * 1024,    // 100 MB (Hỗ trợ file in ấn đồ họa .tif, .psd)
    FEEDBACK: 50 * 1024 * 1024,  // 50 MB
};

export const STORAGE_LIMIT_LABELS: Record<StorageCategory, string> = {
    RECEIPT: '15 MB',
    DOCUMENT: '50 MB',
    MEDIA: '100 MB',
    FEEDBACK: '50 MB',
};

export const ALLOWED_MIME_TYPES: Record<StorageCategory, string[]> = {
    RECEIPT: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    DOCUMENT: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-powerpoint',
        'text/plain',
    ],
    MEDIA: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/svg+xml',
        'image/gif',
        'image/tiff',
        'image/x-tiff',
        'video/mp4',
        'application/pdf',
    ],
    FEEDBACK: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
        'application/csv',
        'application/pdf',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/webp',
    ],
};
