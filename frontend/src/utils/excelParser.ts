import * as XLSX from 'xlsx';
import type {
    CreateFeedbackRequest,
    FeedbackQuestionRole,
    FeedbackRatingItem,
    FeedbackResponse,
    FeedbackSourceType,
    FeedbackSuggestionItem,
    StructuredCustomResponses,
} from '../types/models/knowledge';

export interface ParsedSheetData {
    sheetNames: string[];
    currentSheet: string;
    headers: string[];
    rawRows: Record<string, unknown>[];
    totalRows: number;
    skippedSummaryRows: number;
}

export interface QuestionColumnConfig {
    /** Tên cột gốc trong file Excel */
    rawHeader: string;
    /** Nhãn câu hỏi đã chuẩn hóa (bỏ hậu tố lặp nhánh như ' 2', khoảng trắng thừa) */
    questionLabel: string;
    /** Vai trò của cột: Chấm điểm | Đề xuất/Nhận xét | Phân loại/Định danh | Bỏ qua */
    role: FeedbackQuestionRole;
    /** Thang điểm tối đa (5 hoặc 10) nếu role === 'RATING' */
    scaleMax: number;
    /** Một số giá trị mẫu trong cột để hiển thị preview */
    sampleValues: string[];
}

export interface AggregatedRatingQuestion {
    question: string;
    scaleMax: number;
    averageScore: number;
    responseCount: number;
    minScore: number;
    maxScore: number;
    /** Phân phối số lượng theo từng mức điểm (ví dụ 1..5 hoặc 1..10) */
    distribution: Record<number, number>;
}

export interface AggregatedSuggestionAnswer {
    feedbackId: string;
    answer: string;
    isTrivial: boolean;
    respondentLabel: string;
    tags: string[];
    submittedAt: string;
}

export interface AggregatedSuggestionQuestion {
    question: string;
    totalAnswers: number;
    meaningfulCount: number;
    answers: AggregatedSuggestionAnswer[];
}

export interface ExtractedFeedbackView {
    overallRawScore: number;
    overallScaleMax: number;
    metadata: Record<string, string>;
    ratings: FeedbackRatingItem[];
    suggestions: FeedbackSuggestionItem[];
}

const TIMESTAMP_HEADER_REGEX = /^(dấu thời gian|timestamp|thời gian|time|created_at|date submitted)$/i;
const EMPTY_COLUMN_HEADER_REGEX = /^(cột\s*\d+|__empty.*|column\s*\d+)$/i;

const TRIVIAL_ANSWERS = new Set([
    'không',
    'ko',
    'k',
    'không có',
    'ko có',
    'không ạ',
    'dạ không',
    'dạ ko',
    'chưa',
    'chưa có',
    'hiện tại là chưa',
    'hiện tại chưa',
    'no',
    'none',
    'nothing',
    'n/a',
    'na',
    'nâu',
    'nope',
    '.',
    '-',
    '...',
]);

/**
 * Kiểm tra xem một câu trả lời tự luận có phải là câu trả lời "Không / No / Nothing" ngắn gọn hay không
 */
export function isTrivialSuggestionAnswer(text: string): boolean {
    const cleaned = text
        .trim()
        .toLowerCase()
        .replace(/[!?.]+$/g, '')
        .trim();
    if (!cleaned) return true;
    return TRIVIAL_ANSWERS.has(cleaned);
}

/**
 * Chuẩn hóa tiêu đề câu hỏi (gộp các cột rẽ nhánh của Google Form có hậu tố ' 2', ' 3' ở cuối)
 */
export function normalizeQuestionLabel(rawHeader: string, allHeaders: string[]): string {
    const trimmed = rawHeader.replace(/\s+/g, ' ').trim();
    const match = trimmed.match(/^(.*?)\s+(\d+)$/);
    if (match) {
        const baseCandidate = match[1].trim();
        const hasBaseInSheet = allHeaders.some(
            (h) => h.replace(/\s+/g, ' ').trim().toLowerCase() === baseCandidate.toLowerCase(),
        );
        if (hasBaseInSheet) {
            return baseCandidate;
        }
    }
    return trimmed;
}

/**
 * Lọc bỏ các dòng trống hoặc dòng công thức tổng kết (AVERAGE / SUM) ở cuối bảng Excel
 */
function filterValidRespondentRows(
    rawRows: Record<string, unknown>[],
    headers: string[],
): { validRows: Record<string, unknown>[]; skippedSummaryRows: number } {
    const timestampCol = headers.find((h) => TIMESTAMP_HEADER_REGEX.test(h.trim()));
    const identityCols = headers.filter((h) =>
        /(email|full\s*name|họ\s*tên|tên|mssv|mã\s*số|\bid\b|bảng\s*nào|vị\s*trí|position)/i.test(h),
    );

    const validRows: Record<string, unknown>[] = [];
    let skippedSummaryRows = 0;

    for (const row of rawRows) {
        const nonEmptyEntries = Object.entries(row).filter(
            ([, v]) => v !== '' && v !== null && v !== undefined && String(v).trim() !== '',
        );

        if (nonEmptyEntries.length === 0) {
            continue;
        }

        // Nếu sheet có cột Timestamp (Dấu thời gian) và các cột định danh, nhưng dòng này trống cả Timestamp lẫn định danh
        // và chỉ chứa một vài con số (như dòng AVERAGE / SUM cuối bảng) -> Loại bỏ dòng tổng hợp
        if (timestampCol) {
            const tsVal = row[timestampCol];
            const hasTimestamp = tsVal !== '' && tsVal !== null && tsVal !== undefined && String(tsVal).trim() !== '';
            const hasIdentity = identityCols.some((col) => {
                const v = row[col];
                return v !== '' && v !== null && v !== undefined && String(v).trim() !== '';
            });

            if (!hasTimestamp && !hasIdentity) {
                const allNumeric = nonEmptyEntries.every(([, v]) => {
                    const num = typeof v === 'number' ? v : Number(String(v).trim());
                    return !Number.isNaN(num);
                });
                if (allNumeric) {
                    skippedSummaryRows += 1;
                    continue;
                }
            }
        }

        validRows.push(row);
    }

    return { validRows, skippedSummaryRows };
}

/**
 * Đọc file Excel/CSV từ người dùng và trả về dữ liệu đã lọc bỏ dòng công thức thừa
 */
export async function parseExcelFile(file: File, selectedSheet?: string): Promise<ParsedSheetData> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    if (workbook.SheetNames.length === 0) {
        throw new Error('Tệp Excel không chứa bảng tính (sheet) nào.');
    }

    const currentSheet =
        selectedSheet && workbook.SheetNames.includes(selectedSheet)
            ? selectedSheet
            : workbook.SheetNames[0];

    const worksheet = workbook.Sheets[currentSheet];
    if (!worksheet) {
        throw new Error(`Không tìm thấy sheet: ${currentSheet}`);
    }

    const rawJsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: '',
        blankrows: false,
    });

    // Chuẩn hóa key của mỗi dòng (trim khoảng trắng ở đầu/cuối tên cột)
    const normalizedRows: Record<string, unknown>[] = rawJsonRows.map((row) => {
        const cleanRow: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
            const cleanKey = k.trim();
            if (cleanKey) {
                cleanRow[cleanKey] = v;
            }
        }
        return cleanRow;
    });

    const headerSet = new Set<string>();
    normalizedRows.forEach((row) => {
        Object.keys(row).forEach((k) => headerSet.add(k));
    });
    const headers = Array.from(headerSet).filter(Boolean);

    const { validRows, skippedSummaryRows } = filterValidRespondentRows(normalizedRows, headers);

    return {
        sheetNames: workbook.SheetNames,
        currentSheet,
        headers,
        rawRows: validRows,
        totalRows: validRows.length,
        skippedSummaryRows,
    };
}

/**
 * Tự động phân tích và phân loại toàn bộ các cột câu hỏi trong Sheet
 */
export function autoClassifyColumns(
    headers: string[],
    rawRows: Record<string, unknown>[],
): QuestionColumnConfig[] {
    // Bước 1: Tìm thang điểm tối đa phổ biến của các cột chấm điểm trong toàn bộ Sheet (5 hoặc 10)
    let sheetDetectedMaxScale = 5;
    const rawNumericStats: Record<string, { isRatingCandidate: boolean; maxVal: number }> = {};

    for (const h of headers) {
        const nonEmptyVals = rawRows
            .map((r) => r[h])
            .filter((v) => v !== '' && v !== null && v !== undefined && String(v).trim() !== '');

        const isIdOrDateHeader =
            TIMESTAMP_HEADER_REGEX.test(h) ||
            /(date|ngày|thời gian|mssv|\bid\b|phone|sđt|email)/i.test(h);

        if (nonEmptyVals.length > 0 && !isIdOrDateHeader) {
            const parsedNums = nonEmptyVals.map((v) =>
                typeof v === 'number' ? v : Number(String(v).trim()),
            );
            const allValidRatingNums = parsedNums.every(
                (n) => !Number.isNaN(n) && n >= 1 && n <= 10,
            );
            if (allValidRatingNums) {
                const maxVal = Math.max(...parsedNums);
                rawNumericStats[h] = { isRatingCandidate: true, maxVal };
                if (maxVal > 5) {
                    sheetDetectedMaxScale = 10;
                }
            }
        }
    }

    // Bước 2: Phân loại chi tiết từng cột
    return headers.map((h) => {
        const questionLabel = normalizeQuestionLabel(h, headers);
        const nonEmptyVals = rawRows
            .map((r) => r[h])
            .filter((v) => v !== '' && v !== null && v !== undefined && String(v).trim() !== '');

        const sampleValues = Array.from(
            new Set(nonEmptyVals.map((v) => String(v).trim())),
        ).slice(0, 3);

        // 1. Cột rỗng hoàn toàn hoặc cột Dấu thời gian / Cột thừa
        if (
            nonEmptyVals.length === 0 ||
            TIMESTAMP_HEADER_REGEX.test(h) ||
            EMPTY_COLUMN_HEADER_REGEX.test(h)
        ) {
            return {
                rawHeader: h,
                questionLabel,
                role: 'IGNORE',
                scaleMax: sheetDetectedMaxScale,
                sampleValues,
            };
        }

        // 2. Cột Chấm điểm (RATING)
        if (rawNumericStats[h]?.isRatingCandidate) {
            const colScaleMax = rawNumericStats[h].maxVal > 5 ? 10 : sheetDetectedMaxScale;
            return {
                rawHeader: h,
                questionLabel,
                role: 'RATING',
                scaleMax: colScaleMax,
                sampleValues,
            };
        }

        // 3. Cột Thông tin định danh / Phân loại (METADATA) vs Câu hỏi Đề xuất / Góp ý (SUGGESTION)
        const lower = questionLabel.toLowerCase();
        const isExplicitMetadata =
            /(email|full\s*name|họ\s*và\s*tên|họ\s*tên|\bid\b|mssv|date\s*of|ngày|position|vị\s*trí|bạn\s*tham\s*gia\s*bảng|bảng\s*nào|vai\s*trò|ban\s*nào)/i.test(
                lower,
            );

        const isExplicitSuggestion =
            /(cải\s*thiện|đề\s*xuất|góp\s*ý|nhận\s*xét|comment|feedback|thắc\s*mắc|impressive|least\s*satisfying|suggestions|khó\s*khăn|ý\s*kiến|cảm\s*nhận)/i.test(
                lower,
            );

        // Kiểm tra độ dài trung bình của câu trả lời nếu là câu hỏi lựa chọn ngắn (như Độ khó đề thi: Khó, Vừa sức)
        const totalChars = nonEmptyVals.reduce<number>(
            (acc, v) => acc + String(v).trim().length,
            0,
        );
        const avgLength = totalChars / Math.max(1, nonEmptyVals.length);
        const isShortScaleChoice =
            !isExplicitSuggestion &&
            avgLength <= 15 &&
            /(mức\s*độ\s*khó|độ\s*khó)/i.test(lower);

        const role: FeedbackQuestionRole =
            isExplicitMetadata || isShortScaleChoice ? 'METADATA' : 'SUGGESTION';

        return {
            rawHeader: h,
            questionLabel,
            role,
            scaleMax: sheetDetectedMaxScale,
            sampleValues,
        };
    });
}

/**
 * Chuẩn hóa giá trị điểm số từ một ô dữ liệu
 */
export function parseNumericScore(value: unknown, scaleMax: number): number | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number' && !Number.isNaN(value)) {
        return Math.min(scaleMax, Math.max(1, Number(value.toFixed(2))));
    }
    const str = String(value).trim();
    if (!str) return null;
    const match = str.match(/\d+(\.\d+)?/);
    if (match) {
        const parsed = parseFloat(match[0]);
        if (!Number.isNaN(parsed)) {
            return Math.min(scaleMax, Math.max(1, Number(parsed.toFixed(2))));
        }
    }
    return null;
}

/**
 * Chuẩn hóa giá trị điểm đánh giá sang số nguyên 1 - 5 (cho cột rating_score của DB)
 */
export function normalizeRatingScore(value: unknown, scaleMax = 5): number {
    const score = parseNumericScore(value, scaleMax);
    if (score !== null) {
        const normalized5 = (score / scaleMax) * 5;
        return Math.min(5, Math.max(1, Math.round(normalized5)));
    }

    const str = String(value ?? '').trim().toLowerCase();
    if (str.includes('rất không hài lòng') || str.includes('rất tệ')) return 1;
    if (str.includes('không hài lòng') || str.includes('tệ') || str.includes('chưa tốt')) return 2;
    if (str.includes('rất hài lòng') || str.includes('tuyệt vời') || str.includes('xuất sắc')) return 5;
    if (str.includes('hài lòng') || str.includes('tốt')) return 4;
    if (str.includes('bình thường') || str.includes('tạm ổn') || str.includes('trung bình')) return 3;

    return 5;
}

/**
 * Chuẩn hóa nguồn khảo sát (SourceType)
 */
export function normalizeSourceType(
    value: unknown,
    defaultSource: FeedbackSourceType = 'ATTENDEE',
): FeedbackSourceType {
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
    return defaultSource;
}

/**
 * Chuyển đổi các dòng Excel thành danh sách CreateFeedbackRequest theo cấu hình câu hỏi đa tiêu chí
 */
export function transformRowsWithQuestionConfigs(
    rawRows: Record<string, unknown>[],
    columnConfigs: QuestionColumnConfig[],
    fileUrl: string,
    defaultSource: FeedbackSourceType = 'ATTENDEE',
): CreateFeedbackRequest[] {
    return rawRows
        .map((row) => {
            const ratingsMap = new Map<string, FeedbackRatingItem>();
            const suggestionsMap = new Map<string, string[]>();
            const metadata: Record<string, string> = {};

            for (const col of columnConfigs) {
                if (col.role === 'IGNORE') continue;
                const rawVal = row[col.rawHeader];
                if (rawVal === '' || rawVal === null || rawVal === undefined) continue;
                const strVal = String(rawVal).trim();
                if (!strVal) continue;

                if (col.role === 'RATING') {
                    const numScore = parseNumericScore(rawVal, col.scaleMax);
                    if (numScore !== null) {
                        ratingsMap.set(col.questionLabel, {
                            question: col.questionLabel,
                            score: numScore,
                            scaleMax: col.scaleMax,
                        });
                    }
                } else if (col.role === 'SUGGESTION') {
                    const existing = suggestionsMap.get(col.questionLabel) || [];
                    if (!existing.includes(strVal)) {
                        existing.push(strVal);
                    }
                    suggestionsMap.set(col.questionLabel, existing);
                } else if (col.role === 'METADATA') {
                    // Định dạng ngày Excel nếu cột là Date of Interview (số serial Excel > 40000)
                    let displayMeta = strVal;
                    if (
                        /(date|ngày)/i.test(col.questionLabel) &&
                        typeof rawVal === 'number' &&
                        rawVal > 35000 &&
                        rawVal < 60000
                    ) {
                        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
                        const dateObj = new Date(excelEpoch.getTime() + rawVal * 86400000);
                        displayMeta = dateObj.toLocaleDateString('vi-VN');
                    }
                    metadata[col.questionLabel] = metadata[col.questionLabel]
                        ? `${metadata[col.questionLabel]} / ${displayMeta}`
                        : displayMeta;
                }
            }

            const ratings = Array.from(ratingsMap.values());
            const suggestions: FeedbackSuggestionItem[] = Array.from(suggestionsMap.entries()).map(
                ([question, answers]) => ({
                    question,
                    answer: answers.join(' | '),
                }),
            );

            // Tính điểm trung bình của người điền trên thang điểm gốc và quy đổi về thang 1..5 cho DB
            let overallRawScore = 5;
            let overallScaleMax = 5;
            let dbRatingScore = 5;

            if (ratings.length > 0) {
                overallScaleMax = Math.max(...ratings.map((r) => r.scaleMax));
                const normalizedSum = ratings.reduce(
                    (sum, r) => sum + (r.score / r.scaleMax) * overallScaleMax,
                    0,
                );
                overallRawScore = Number((normalizedSum / ratings.length).toFixed(2));
                const scoreOn5 = (overallRawScore / overallScaleMax) * 5;
                dbRatingScore = Math.min(5, Math.max(1, Math.round(scoreOn5)));
            }

            // Tự động trích xuất highlightContent & improvementContent tiêu biểu từ các câu trả lời có ý nghĩa
            const meaningfulHighlights: string[] = [];
            const meaningfulImprovements: string[] = [];

            for (const s of suggestions) {
                if (isTrivialSuggestionAnswer(s.answer)) continue;
                const qLower = s.question.toLowerCase();
                if (/(impressive|thích|hài lòng|điểm sáng|ấn tượng)/i.test(qLower)) {
                    meaningfulHighlights.push(s.answer);
                } else {
                    meaningfulImprovements.push(s.answer);
                }
            }

            const customResponses: StructuredCustomResponses = {
                _schemaVersion: 2,
                _overallRawScore: overallRawScore,
                _overallScaleMax: overallScaleMax,
                metadata,
                ratings,
                suggestions,
            };

            return {
                sourceType: defaultSource,
                fileUrl,
                ratingScore: dbRatingScore,
                highlightContent:
                    meaningfulHighlights.length > 0 ? meaningfulHighlights.join(' • ') : null,
                improvementContent:
                    meaningfulImprovements.length > 0 ? meaningfulImprovements.join(' • ') : null,
                customResponses,
            };
        })
        .filter(
            (req) =>
                (req.customResponses?.ratings && req.customResponses.ratings.length > 0) ||
                (req.customResponses?.suggestions && req.customResponses.suggestions.length > 0) ||
                (req.customResponses?.metadata &&
                    Object.keys(req.customResponses.metadata).length > 0),
        );
}

/**
 * Đọc cấu trúc câu hỏi & điểm từ một bản ghi FeedbackResponse (hỗ trợ cả Schema v2 mới và dữ liệu phẳng cũ)
 */
export function extractStructuredFeedback(fb: FeedbackResponse): ExtractedFeedbackView {
    const cr = fb.customResponses || {};

    if (
        cr._schemaVersion === 2 &&
        (Array.isArray(cr.ratings) || Array.isArray(cr.suggestions))
    ) {
        const ratings = Array.isArray(cr.ratings) ? cr.ratings : [];
        const suggestions = Array.isArray(cr.suggestions) ? cr.suggestions : [];
        const metadata =
            cr.metadata && typeof cr.metadata === 'object'
                ? (cr.metadata as Record<string, string>)
                : {};
        const overallScaleMax =
            typeof cr._overallScaleMax === 'number'
                ? cr._overallScaleMax
                : ratings[0]?.scaleMax || 5;
        const overallRawScore =
            typeof cr._overallRawScore === 'number' ? cr._overallRawScore : fb.ratingScore;

        return {
            overallRawScore,
            overallScaleMax,
            metadata,
            ratings,
            suggestions,
        };
    }

    // Fallback tương thích ngược cho các bản ghi đã import theo định dạng phẳng trước đây
    const ratings: FeedbackRatingItem[] = [];
    const suggestions: FeedbackSuggestionItem[] = [];
    const metadata: Record<string, string> = {};

    const rawEntries = Object.entries(cr).filter(([k]) => !k.startsWith('_'));
    const allKeys = rawEntries.map(([k]) => k);

    let detectedScaleMax = 5;
    for (const [k, v] of rawEntries) {
        if (TIMESTAMP_HEADER_REGEX.test(k) || /(date|ngày|mssv|\bid\b)/i.test(k)) continue;
        const num = typeof v === 'number' ? v : Number(String(v).trim());
        if (!Number.isNaN(num) && num > 5 && num <= 10) {
            detectedScaleMax = 10;
        }
    }

    for (const [k, v] of rawEntries) {
        if (v === '' || v === null || v === undefined) continue;
        if (TIMESTAMP_HEADER_REGEX.test(k) || EMPTY_COLUMN_HEADER_REGEX.test(k)) continue;

        const label = normalizeQuestionLabel(k, allKeys);
        const strVal = String(v).trim();
        if (!strVal) continue;

        const isIdOrMeta =
            /(email|full\s*name|họ\s*tên|\bid\b|mssv|date\s*of|position|vị\s*trí|bạn\s*tham\s*gia\s*bảng|bảng\s*nào|mức\s*độ\s*khó)/i.test(
                label,
            );

        const num = typeof v === 'number' ? v : Number(strVal);
        if (!isIdOrMeta && !Number.isNaN(num) && num >= 1 && num <= 10) {
            ratings.push({
                question: label,
                score: Number(num.toFixed(2)),
                scaleMax: detectedScaleMax,
            });
        } else if (isIdOrMeta) {
            metadata[label] = strVal;
        } else {
            suggestions.push({
                question: label,
                answer: strVal,
            });
        }
    }

    if (fb.highlightContent && suggestions.length === 0) {
        suggestions.push({
            question: 'Điểm sáng nổi bật (Highlight)',
            answer: fb.highlightContent,
        });
    }
    if (fb.improvementContent && suggestions.length === 0) {
        suggestions.push({
            question: 'Đề xuất cải tiến (Improvement)',
            answer: fb.improvementContent,
        });
    }

    const overallScaleMax = ratings.length > 0 ? Math.max(...ratings.map((r) => r.scaleMax)) : 5;
    const overallRawScore =
        ratings.length > 0
            ? Number(
                  (
                      ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
                  ).toFixed(2),
              )
            : fb.ratingScore;

    return {
        overallRawScore,
        overallScaleMax,
        metadata,
        ratings,
        suggestions,
    };
}

/**
 * Tổng hợp thống kê theo từng câu hỏi Chấm điểm và từng câu hỏi Đề xuất trên danh sách FeedbackResponse
 */
export function aggregateFeedbackQuestions(feedbacks: FeedbackResponse[]): {
    ratingQuestions: AggregatedRatingQuestion[];
    suggestionQuestions: AggregatedSuggestionQuestion[];
    dominantScaleMax: number;
    overallAverageOnScale: number;
} {
    const ratingMap = new Map<
        string,
        {
            scaleMax: number;
            scores: number[];
            distribution: Record<number, number>;
        }
    >();

    const suggestionMap = new Map<string, AggregatedSuggestionAnswer[]>();

    let totalRespondentNormalized = 0;
    let respondentWithRatingCount = 0;
    let dominantScaleMax = 5;

    for (const fb of feedbacks) {
        const extracted = extractStructuredFeedback(fb);
        if (extracted.overallScaleMax > dominantScaleMax) {
            dominantScaleMax = extracted.overallScaleMax;
        }
    }

    for (const fb of feedbacks) {
        const extracted = extractStructuredFeedback(fb);

        if (extracted.ratings.length > 0) {
            const normScore =
                (extracted.overallRawScore / extracted.overallScaleMax) * dominantScaleMax;
            totalRespondentNormalized += normScore;
            respondentWithRatingCount += 1;
        }

        // Nhãn định danh ngắn gọn của người điền (nếu có trong metadata)
        const metaEntries = Object.entries(extracted.metadata);
        const nameEntry = metaEntries.find(([k]) => /(full\s*name|họ\s*tên|tên)/i.test(k));
        const idEntry = metaEntries.find(([k]) => /(\bid\b|mssv)/i.test(k));
        const respondentLabel = nameEntry
            ? idEntry
                ? `${nameEntry[1]} (${idEntry[1]})`
                : nameEntry[1]
            : `Phiếu #${fb.id.slice(0, 6).toUpperCase()}`;

        const tags = metaEntries
            .filter(([k]) => !/(email|full\s*name|họ\s*tên|\bid\b|mssv|date)/i.test(k))
            .map(([, v]) => v);

        // Gom câu hỏi chấm điểm
        for (const r of extracted.ratings) {
            const current = ratingMap.get(r.question) || {
                scaleMax: r.scaleMax,
                scores: [],
                distribution: {},
            };
            if (r.scaleMax > current.scaleMax) {
                current.scaleMax = r.scaleMax;
            }
            current.scores.push(r.score);
            const bucket = Math.round(r.score);
            current.distribution[bucket] = (current.distribution[bucket] || 0) + 1;
            ratingMap.set(r.question, current);
        }

        // Gom câu hỏi đề xuất / nhận xét
        for (const s of extracted.suggestions) {
            const list = suggestionMap.get(s.question) || [];
            list.push({
                feedbackId: fb.id,
                answer: s.answer,
                isTrivial: isTrivialSuggestionAnswer(s.answer),
                respondentLabel,
                tags,
                submittedAt: fb.submittedAt,
            });
            suggestionMap.set(s.question, list);
        }
    }

    const ratingQuestions: AggregatedRatingQuestion[] = Array.from(ratingMap.entries()).map(
        ([question, data]) => {
            const sum = data.scores.reduce((a, b) => a + b, 0);
            const avg = data.scores.length > 0 ? Number((sum / data.scores.length).toFixed(2)) : 0;
            return {
                question,
                scaleMax: data.scaleMax,
                averageScore: avg,
                responseCount: data.scores.length,
                minScore: data.scores.length > 0 ? Math.min(...data.scores) : 0,
                maxScore: data.scores.length > 0 ? Math.max(...data.scores) : 0,
                distribution: data.distribution,
            };
        },
    );

    const suggestionQuestions: AggregatedSuggestionQuestion[] = Array.from(
        suggestionMap.entries(),
    ).map(([question, answers]) => ({
        question,
        totalAnswers: answers.length,
        meaningfulCount: answers.filter((a) => !a.isTrivial).length,
        answers,
    }));

    const overallAverageOnScale =
        respondentWithRatingCount > 0
            ? Number((totalRespondentNormalized / respondentWithRatingCount).toFixed(2))
            : 0;

    return {
        ratingQuestions,
        suggestionQuestions,
        dominantScaleMax,
        overallAverageOnScale,
    };
}
