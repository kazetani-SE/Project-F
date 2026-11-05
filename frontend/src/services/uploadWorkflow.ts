import {
    type StorageCategory,
    type UploadedFileResult,
    STORAGE_LIMITS,
    STORAGE_LIMIT_LABELS,
    ALLOWED_MIME_TYPES,
} from '../types/models/storage.ts';

/**
 * Kiểm tra tính hợp lệ của tệp (dung lượng & định dạng MIME) trước khi tiếp nhận
 */
export function validateUploadFile(file: File, category: StorageCategory): void {
    if (!file) {
        throw new Error('Vui lòng chọn một tệp');
    }

    // 1. Kiểm tra dung lượng
    const maxLimit = STORAGE_LIMITS[category];
    if (file.size > maxLimit) {
        const limitLabel = STORAGE_LIMIT_LABELS[category];
        const fileSizeMb = (file.size / (1024 * 1024)).toFixed(1);
        throw new Error(
            `Kích thước tệp (${fileSizeMb}MB) vượt quá hạn mức cho phép (${limitLabel}) cho danh mục ${category}`
        );
    }

    // 2. Kiểm tra định dạng MIME
    const allowed = ALLOWED_MIME_TYPES[category];
    if (allowed && allowed.length > 0 && file.type && !allowed.includes(file.type)) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        const isExcelOrCsv =
            (ext === 'xlsx' || ext === 'xls' || ext === 'csv') &&
            (category === 'FEEDBACK' || category === 'DOCUMENT');
        if (!isExcelOrCsv) {
            throw new Error(
                `Định dạng tệp "${file.type}" không được hỗ trợ cho danh mục ${category}`
            );
        }
    }
}

export interface StagedUploadOptions<T> {
    file: File | null;
    category: StorageCategory;
    uploadToS3: (file: File, category: StorageCategory) => Promise<UploadedFileResult>;
    saveToDatabase: (fileUrl: string) => Promise<T>;
}

/**
 * Thực hiện chu trình Tải lên S3 có kiểm soát:
 * - Bước 1: Upload file lên Amazon S3 qua Pre-signed URL.
 * - Bước 2: CHỈ KHI S3 thành công, mới gọi hàm lưu vào CSDL (Database).
 * - Nếu Bước 1 gặp sự cố (mạng, CORS, hết hạn,...): Lập tức hủy bỏ tiến trình, KHÔNG gọi Database, ném lỗi ra ngoài.
 */
export async function executeStagedUploadAndSave<T>({
    file,
    category,
    uploadToS3,
    saveToDatabase,
}: StagedUploadOptions<T>): Promise<T> {
    if (!file) {
        throw new Error('Không có tệp nào được chọn để tải lên');
    }

    // Tiền kiểm tra trước khi gửi request
    validateUploadFile(file, category);

    // Bước 1: Upload lên S3
    let uploadResult: UploadedFileResult;
    try {
        uploadResult = await uploadToS3(file, category);
    } catch (uploadError: unknown) {
        const msg =
            uploadError instanceof Error
                ? uploadError.message
                : 'Lỗi khi tải tệp lên Amazon S3';
        throw new Error(`[S3 Upload Thất Bại] ${msg}. Tiến trình lưu CSDL đã được hủy an toàn.`);
    }

    // Bước 2: Lưu vào Database với fileUrl đã được xác thực từ S3
    try {
        return await saveToDatabase(uploadResult.fileUrl);
    } catch (dbError: unknown) {
        const msg =
            dbError instanceof Error
                ? dbError.message
                : 'Lỗi khi lưu thông tin vào cơ sở dữ liệu';
        throw new Error(`[Database Thất Bại] Tệp đã tải lên S3 nhưng lưu CSDL lỗi: ${msg}`);
    }
}

/**
 * Tăng số hiệu phiên bản tài liệu theo cấp số nguyên (ví dụ: "1.0" -> "1.1", "1.9" -> "1.10")
 * thay vì cộng số thực dấu phẩy động.
 */
export function incrementDocumentVersion(currentVersion: string): string {
    if (!currentVersion || !currentVersion.trim()) {
        return '1.1';
    }
    const normalized = currentVersion.trim().replace(/^[vV]/, '');
    const dotIdx = normalized.lastIndexOf('.');
    if (dotIdx > 0 && dotIdx < normalized.length - 1) {
        const majorPart = normalized.slice(0, dotIdx);
        const minor = Number.parseInt(normalized.slice(dotIdx + 1), 10);
        if (!Number.isNaN(minor)) {
            return `${majorPart}.${minor + 1}`;
        }
    }
    const majorOnly = Number.parseInt(normalized, 10);
    if (!Number.isNaN(majorOnly)) {
        return `${majorOnly}.1`;
    }
    return `${normalized}.1`;
}

/**
 * Truy vết toàn bộ cây phả hệ phiên bản (từ bản gốc đến mọi bản con nhiều cấp)
 * của một tài liệu bất kỳ trong danh sách.
 */
export function resolveVersionHistoryChain<
    T extends { id: string; parentDocumentId: string | null },
>(allDocs: T[], targetDoc: T): T[] {
    const byId = new Map<string, T>(allDocs.map((d) => [d.id, d]));

    // Tìm nút gốc (root ancestor)
    let rootId = targetDoc.id;
    const visitedUp = new Set<string>([rootId]);
    let cursor: T | undefined = targetDoc;
    while (cursor?.parentDocumentId && byId.has(cursor.parentDocumentId)) {
        if (visitedUp.has(cursor.parentDocumentId)) break;
        rootId = cursor.parentDocumentId;
        visitedUp.add(rootId);
        cursor = byId.get(rootId);
    }

    // Duyệt BFS từ rootId xuống tất cả các nhánh hậu duệ
    const lineageIds = new Set<string>([rootId]);
    let added = true;
    while (added) {
        added = false;
        for (const doc of allDocs) {
            if (
                doc.parentDocumentId &&
                lineageIds.has(doc.parentDocumentId) &&
                !lineageIds.has(doc.id)
            ) {
                lineageIds.add(doc.id);
                added = true;
            }
        }
    }

    return allDocs.filter((d) => lineageIds.has(d.id));
}
