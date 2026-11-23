import { apiClient } from './apiClient';
import type { ApiResponse } from '../types/common/api';
import type {
    PresignedDownloadResponse,
    PresignedUploadRequest,
    PresignedUploadResponse,
    S3ObjectVersionResponse,
} from '../types/models/storage';

export async function getPresignedUploadUrl(
    request: PresignedUploadRequest,
): Promise<PresignedUploadResponse> {
    const res = await apiClient.post<ApiResponse<PresignedUploadResponse>>(
        '/storage/presigned-upload',
        request,
    );
    return res.data.data;
}

const downloadUrlCache = new Map<string, { data: PresignedDownloadResponse; expiresAt: number }>();
const inFlightDownloadRequests = new Map<string, Promise<PresignedDownloadResponse>>();

export async function getPresignedDownloadUrl(
    objectKey: string,
): Promise<PresignedDownloadResponse> {
    const cached = downloadUrlCache.get(objectKey);
    // Presigned URL mặc định sống 10-15 phút trên S3; tái sử dụng trong vòng 10 phút để tránh gọi API
    if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
    }

    const inFlight = inFlightDownloadRequests.get(objectKey);
    if (inFlight) {
        return inFlight;
    }

    const reqPromise = (async () => {
        try {
            const res = await apiClient.get<ApiResponse<PresignedDownloadResponse>>(
                '/storage/presigned-download',
                {
                    params: { objectKey },
                },
            );
            const data = res.data.data;
            if (data?.downloadUrl) {
                downloadUrlCache.set(objectKey, {
                    data,
                    expiresAt: Date.now() + 10 * 60 * 1000,
                });
            }
            return data;
        } finally {
            inFlightDownloadRequests.delete(objectKey);
        }
    })();

    inFlightDownloadRequests.set(objectKey, reqPromise);
    return reqPromise;
}

export async function listS3ObjectVersions(
    objectKey: string,
): Promise<S3ObjectVersionResponse[]> {
    const res = await apiClient.get<ApiResponse<S3ObjectVersionResponse[]>>(
        '/storage/versions',
        {
            params: { objectKey },
        },
    );
    return res.data.data ?? [];
}

export async function deleteFileFromS3(
    objectKey: string,
    versionId?: string | null,
): Promise<void> {
    downloadUrlCache.delete(objectKey);
    if (versionId) {
        downloadUrlCache.delete(`${objectKey}?versionId=${versionId}`);
    }
    await apiClient.delete<ApiResponse<null>>('/storage/file', {
        params: versionId ? { objectKey, versionId } : { objectKey },
    });
}

export function extractS3VersionId(fileUrlOrKey: string | null | undefined): string | null {
    if (!fileUrlOrKey) return null;
    const qIdx = fileUrlOrKey.indexOf('?');
    if (qIdx < 0) return null;
    const params = new URLSearchParams(fileUrlOrKey.slice(qIdx + 1));
    return params.get('versionId');
}

export function stripS3QueryParams(fileUrlOrKey: string | null | undefined): string {
    if (!fileUrlOrKey) return '';
    const qIdx = fileUrlOrKey.indexOf('?');
    return qIdx >= 0 ? fileUrlOrKey.slice(0, qIdx) : fileUrlOrKey;
}

export function uploadBinaryToS3(
    uploadUrl: string,
    file: File,
    onProgress?: (percentage: number) => void,
): Promise<{ versionId?: string | null }> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

        if (xhr.upload && onProgress) {
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    onProgress(percent);
                }
            };
        }

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                if (onProgress) onProgress(100);
                const versionId = xhr.getResponseHeader('x-amz-version-id');
                resolve({ versionId: versionId?.trim() || null });
            } else {
                reject(
                    new Error(
                        `Tải tệp lên S3 thất bại (Mã lỗi ${xhr.status}: ${xhr.statusText || 'Lỗi mạng'})`,
                    ),
                );
            }
        };

        xhr.onerror = () => {
            reject(new Error('Lỗi kết nối khi tải tệp lên Amazon S3 (Kiểm tra CORS hoặc kết nối mạng)'));
        };

        xhr.onabort = () => {
            reject(new Error('Quá trình tải tệp đã bị hủy'));
        };

        xhr.send(file);
    });
}
