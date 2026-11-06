import * as XLSX from 'xlsx';
import type { CreateFeedbackRequest, FeedbackSourceType } from '../types/models/knowledge';

export interface ParsedSheetData {
    sheetNames: string[];
    currentSheet: string;
    headers: string[];
    rawRows: Record<string, unknown>[];
    totalRows: number;
}

export interface FeedbackColumnMapping {
    sourceTypeColumn?: string;
    ratingScoreColumn?: string;
    highlightContentColumn?: string;
    improvementContentColumn?: string;
}

/**
 * Đọc file Excel/CSV từ người dùng và trả về sheet đầu tiên cùng danh sách cột
 */
export async function parseExcelFile(file: File, selectedSheet?: string): Promise<ParsedSheetData> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    if (workbook.SheetNames.length === 0) {
        throw new Error('Tệp Excel không chứa bảng tính (sheet) nào.');
    }

    const currentSheet = selectedSheet && workbook.SheetNames.includes(selectedSheet)
        ? selectedSheet
        : workbook.SheetNames[0];

    const worksheet = workbook.Sheets[currentSheet];
    if (!worksheet) {
        throw new Error(`Không tìm thấy sheet: ${currentSheet}`);
    }

    // Đọc dạng json object với key là header
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: '',
        blankrows: false,
    });

    // Lấy danh sách header duy nhất
    const headerSet = new Set<string>();
    rawRows.forEach((row) => {
        Object.keys(row).forEach((k) => headerSet.add(k.trim()));
    });
    const headers = Array.from(headerSet).filter(Boolean);

    return {
        sheetNames: workbook.SheetNames,
        currentSheet,
        headers,
        rawRows,
        totalRows: rawRows.length,
    };
}

/**
 * Tự động phỏng đoán cột tương ứng với các trường của Feedback
 */
export function autoDetectFeedbackMapping(headers: string[]): FeedbackColumnMapping {
    const mapping: FeedbackColumnMapping = {};

    for (const h of headers) {
        const lower = h.toLowerCase();

        // Rating score
        if (!mapping.ratingScoreColumn && /(điểm|rating|sao|đánh giá|score|hài lòng)/i.test(lower)) {
            mapping.ratingScoreColumn = h;
            continue;
        }

        // Highlight
        if (!mapping.highlightContentColumn && /(thích|điểm sáng|highlight|ấn tượng|tốt nhất|khen)/i.test(lower)) {
            mapping.highlightContentColumn = h;
            continue;
        }

        // Improvement
        if (!mapping.improvementContentColumn && /(cải thiện|khắc phục|góp ý|đề xuất|hạn chế|chưa tốt|improve)/i.test(lower)) {
            mapping.improvementContentColumn = h;
            continue;
        }

        // Source type (đối tượng / vai trò)
        if (!mapping.sourceTypeColumn && /(đối tượng|vai trò|nhóm|source|role|bạn là)/i.test(lower)) {
            mapping.sourceTypeColumn = h;
            continue;
        }
    }

    return mapping;
}

/**
 * Chuẩn hóa giá trị điểm đánh giá sang số nguyên 1 - 5
 */
export function normalizeRatingScore(value: unknown): number {
    if (value === null || value === undefined) return 5;

    if (typeof value === 'number') {
        const rounded = Math.round(value);
        return Math.min(5, Math.max(1, rounded));
    }

    const str = String(value).trim().toLowerCase();

    // Thứ tự kiểm tra: phủ định & mức độ mạnh kiểm tra trước
    if (str.includes('rất không hài lòng') || str.includes('rất tệ')) return 1;
    if (str.includes('không hài lòng') || str.includes('tệ') || str.includes('chưa tốt')) return 2;
    if (str.includes('rất hài lòng') || str.includes('tuyệt vời') || str.includes('xuất sắc')) return 5;
    if (str.includes('hài lòng') || str.includes('tốt')) return 4;
    if (str.includes('bình thường') || str.includes('tạm ổn') || str.includes('trung bình')) return 3;

    // Trích xuất số đầu tiên tìm thấy
    const match = str.match(/\d+(\.\d+)?/);
    if (match) {
        const num = Math.round(parseFloat(match[0]));
        return Math.min(5, Math.max(1, num));
    }

    return 5; // Mặc định 5 nếu không xác định được
}

/**
 * Chuẩn hóa nguồn khảo sát (SourceType)
 */
export function normalizeSourceType(value: unknown, defaultSource: FeedbackSourceType = 'ATTENDEE'): FeedbackSourceType {
    if (!value) return defaultSource;
    const str = String(value).trim().toLowerCase();

    if (str.includes('ban tổ chức') || str.includes('btc') || str.includes('organizer') || str.includes('nội bộ')) {
        return 'ORGANIZER';
    }
    if (str.includes('tài trợ') || str.includes('sponsor') || str.includes('doanh nghiệp')) {
        return 'SPONSOR';
    }
    if (str.includes('diễn giả') || str.includes('speaker') || str.includes('khách mời')) {
        return 'SPEAKER';
    }
    return 'ATTENDEE';
}

/**
 * Chuyển đổi dữ liệu bảng tính thành danh sách CreateFeedbackRequest chuẩn hóa
 */
export function transformRowsToFeedbackRequests(
    rawRows: Record<string, unknown>[],
    mapping: FeedbackColumnMapping,
    fileUrl: string,
    defaultSource: FeedbackSourceType = 'ATTENDEE',
): CreateFeedbackRequest[] {
    return rawRows
        .filter((row) => {
            // Loại bỏ dòng trắng hoàn toàn
            const values = Object.values(row).map((v) => String(v).trim()).filter(Boolean);
            return values.length > 0;
        })
        .map((row) => {
            const ratingRaw = mapping.ratingScoreColumn ? row[mapping.ratingScoreColumn] : undefined;
            const ratingScore = normalizeRatingScore(ratingRaw);

            const highlightRaw = mapping.highlightContentColumn ? row[mapping.highlightContentColumn] : undefined;
            const highlightContent = highlightRaw ? String(highlightRaw).trim() : null;

            const improveRaw = mapping.improvementContentColumn ? row[mapping.improvementContentColumn] : undefined;
            const improvementContent = improveRaw ? String(improveRaw).trim() : null;

            const sourceRaw = mapping.sourceTypeColumn ? row[mapping.sourceTypeColumn] : undefined;
            const sourceType = normalizeSourceType(sourceRaw, defaultSource);

            // Gom tất cả các cột còn lại vào customResponses
            const customResponses: Record<string, unknown> = {};
            const mappedCols = new Set([
                mapping.ratingScoreColumn,
                mapping.highlightContentColumn,
                mapping.improvementContentColumn,
                mapping.sourceTypeColumn,
            ].filter(Boolean));

            for (const [key, val] of Object.entries(row)) {
                if (!mappedCols.has(key) && val !== '' && val !== null && val !== undefined) {
                    customResponses[key] = val;
                }
            }

            return {
                sourceType,
                fileUrl,
                ratingScore,
                highlightContent: highlightContent || null,
                improvementContent: improvementContent || null,
                customResponses,
            };
        });
}
