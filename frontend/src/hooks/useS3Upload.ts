import { useState, useCallback } from 'react';
import {
    getPresignedUploadUrl,
    uploadBinaryToS3,
} from '../services/storageService';
import { validateUploadFile } from '../services/uploadWorkflow';
import {
    type StorageCategory,
    type UploadedFileResult,
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

            try {
                validateUploadFile(file, category);
            } catch (validationErr: unknown) {
                const msg =
                    validationErr instanceof Error ? validationErr.message : 'Tệp tải lên không hợp lệ';
                setError(msg);
                throw validationErr;
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
                const uploadResult = await uploadBinaryToS3(presigned.uploadUrl, file, (percent) => {
                    setProgress(percent);
                });

                const finalFileUrl = uploadResult?.versionId
                    ? `${presigned.fileUrl}?versionId=${encodeURIComponent(uploadResult.versionId)}`
                    : presigned.fileUrl;

                const result: UploadedFileResult = {
                    fileUrl: finalFileUrl,
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
