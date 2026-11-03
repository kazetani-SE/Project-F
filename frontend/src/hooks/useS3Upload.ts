import { useState, useCallback } from 'react';
import {
    getPresignedUploadUrl,
    uploadBinaryToS3,
} from '../services/storageService';
import {
    type StorageCategory,
    type UploadedFileResult,
    STORAGE_LIMITS,
    STORAGE_LIMIT_LABELS,
    ALLOWED_MIME_TYPES,
} from '../types/models/storage';

export function useS3Upload() {
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [uploadedFile, setUploadedFile] = useState<UploadedFileResult | null>(null);

    const reset = useCallback(() => {
        setIsUploading(false);
        setProgress(0);
        setError(null);
        setUploadedFile(null);
    }, []);

    const uploadFile = useCallback(
        async (file: File, category: StorageCategory): Promise<UploadedFileResult> => {
            setError(null);
            setProgress(0);

            // 1. Kiểm tra kích thước tệp
            const maxLimit = STORAGE_LIMITS[category];
            if (file.size > maxLimit) {
                const limitLabel = STORAGE_LIMIT_LABELS[category];
                const msg = `Kích thước tệp (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá hạn mức cho phép (${limitLabel})`;
                setError(msg);
                throw new Error(msg);
            }

            // 2. Kiểm tra định dạng MIME nếu danh mục có whitelist
            const allowed = ALLOWED_MIME_TYPES[category];
            if (allowed && allowed.length > 0 && file.type && !allowed.includes(file.type)) {
                const msg = `Định dạng tệp "${file.type}" không được hỗ trợ cho danh mục ${category}`;
                setError(msg);
                throw new Error(msg);
            }

            setIsUploading(true);
            try {
                // 3. Xin pre-signed upload URL từ backend
                const presigned = await getPresignedUploadUrl({
                    fileName: file.name,
                    mimeType: file.type || 'application/octet-stream',
                    fileSize: file.size,
                    category,
                });

                // 4. Upload binary trực tiếp lên S3
                await uploadBinaryToS3(presigned.uploadUrl, file, (percent) => {
                    setProgress(percent);
                });

                const result: UploadedFileResult = {
                    fileUrl: presigned.fileUrl,
                    objectKey: presigned.objectKey,
                    fileName: file.name,
                    fileSize: file.size,
                    mimeType: file.type,
                };

                setUploadedFile(result);
                return result;
            } catch (err: unknown) {
                const errorMessage =
                    err instanceof Error ? err.message : 'Đã có lỗi xảy ra trong quá trình tải tệp';
                setError(errorMessage);
                throw err;
            } finally {
                setIsUploading(false);
            }
        },
        [],
    );

    return {
        isUploading,
        progress,
        error,
        uploadedFile,
        uploadFile,
        reset,
    };
}
