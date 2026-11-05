export type StorageCategory = 'RECEIPT' | 'DOCUMENT' | 'MEDIA' | 'FEEDBACK';

export interface PresignedUploadRequest {
    fileName: string;
    mimeType: string;
    fileSize: number;
    category: StorageCategory;
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

export interface UploadedFileResult {
    fileUrl: string;
    objectKey: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
}

export const STORAGE_LIMITS: Record<StorageCategory, number> = {
    RECEIPT: 15 * 1024 * 1024,   // 15 MB
    DOCUMENT: 50 * 1024 * 1024,  // 50 MB
    MEDIA: 50 * 1024 * 1024,     // 50 MB
    FEEDBACK: 50 * 1024 * 1024,  // 50 MB
};

export const STORAGE_LIMIT_LABELS: Record<StorageCategory, string> = {
    RECEIPT: '15 MB',
    DOCUMENT: '50 MB',
    MEDIA: '50 MB',
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
        'video/mp4',
        'application/pdf',
    ],
    FEEDBACK: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
        'text/plain',
    ],
};
