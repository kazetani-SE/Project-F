import { apiClient } from './apiClient';
import type { ApiResponse } from '../types/common/api';
import type {
    PresignedDownloadResponse,
    PresignedUploadRequest,
    PresignedUploadResponse,
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

export async function getPresignedDownloadUrl(
    objectKey: string,
): Promise<PresignedDownloadResponse> {
    const res = await apiClient.get<ApiResponse<PresignedDownloadResponse>>(
        '/storage/presigned-download',
        {
            params: { objectKey },
        },
    );
    return res.data.data;
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
