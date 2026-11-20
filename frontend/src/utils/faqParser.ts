import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import type { CreateFaqRequest } from '../types/models/knowledge';

export interface ParsedFaqItem {
    id: string;
    question: string;
    answer: string;
    category: string;
    isPinned: boolean;
    sourceIndex?: number | string;
    isValid: boolean;
    errorReason?: string;
}

export interface FaqColumnMapping {
    questionCol: string;
    answerCol: string;
    categoryCol?: string;
    pinnedCol?: string;
}

export interface ExcelFaqData {
    sheetNames: string[];
    currentSheet: string;
    headers: string[];
    rawRows: Record<string, unknown>[];
    detectedMapping: FaqColumnMapping;
    items: ParsedFaqItem[];
}

export interface WordFaqData {
    detectedMode: 'TABLE' | 'QA_TEXT' | 'RAW_TEXT';
    items: ParsedFaqItem[];
}

export interface FaqParseResult {
    fileType: 'EXCEL' | 'WORD';
    fileName: string;
    excelData?: ExcelFaqData;
    wordData?: WordFaqData;
    items: ParsedFaqItem[];
    validCount: number;
    invalidCount: number;
}

const QUESTION_REGEX = /(câu hỏi|cau hoi|question|tiêu đề|tieu de|\bhỏi\b|\bq\b|thắc mắc|thac mac)/i;
const ANSWER_REGEX = /(câu trả lời|cau tra loi|trả lời|tra loi|answer|giải đáp|giai dap|\bđáp\b|\bdap\b|nội dung|noi dung|\ba\b)/i;
const CATEGORY_REGEX = /(danh mục|danh muc|category|phân loại|phan loai|chủ đề|chu de|nhóm|nhom)/i;
const PINNED_REGEX = /(ghim|pin|ưu tiên|uu tien|is_pinned|pinned)/i;

/**
 * Sinh ID ngẫu nhiên cho item client-side
 */
function generateClientFaqId(): string {
    return 'faq_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
}

/**
 * Kiểm tra giá trị boolean dạng chuỗi hoặc số
 */
function parseBooleanValue(val: unknown): boolean {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val === 1;
    if (typeof val === 'string') {
        const lower = val.trim().toLowerCase();
        return ['true', '1', 'có', 'yes', 'y', 'x', 'ghim', 'co'].includes(lower);
    }
    return false;
}

/**
 * Tự động phát hiện cột mapping trong Excel
 */
export function detectFaqColumns(headers: string[]): FaqColumnMapping {
    let questionCol = '';
    let answerCol = '';
    let categoryCol = '';
    let pinnedCol = '';

    for (const h of headers) {
        const trimmed = h.trim();
        if (!questionCol && QUESTION_REGEX.test(trimmed)) {
            questionCol = h;
            continue;
        }
        if (!answerCol && ANSWER_REGEX.test(trimmed)) {
            answerCol = h;
            continue;
        }
        if (!categoryCol && CATEGORY_REGEX.test(trimmed)) {
            categoryCol = h;
            continue;
        }
        if (!pinnedCol && PINNED_REGEX.test(trimmed)) {
            pinnedCol = h;
        }
    }

    // Fallback nếu không khớp regex
    if (!questionCol && headers.length > 0) {
        questionCol = headers[0];
    }
    if (!answerCol && headers.length > 1) {
        answerCol = headers[1];
    }
    if (!categoryCol && headers.length > 2) {
        categoryCol = headers[2];
    }
    if (!pinnedCol && headers.length > 3) {
        pinnedCol = headers[3];
    }

    return {
        questionCol,
        answerCol,
        categoryCol: categoryCol || undefined,
        pinnedCol: pinnedCol || undefined,
    };
}

/**
 * Chuyển các dòng Excel thành ParsedFaqItem dựa vào mapping
 */
export function transformExcelRows(
    rawRows: Record<string, unknown>[],
    mapping: FaqColumnMapping,
    defaultCategory: string = 'Thể lệ & Tham dự',
): ParsedFaqItem[] {
    return rawRows.map((row, idx) => {
        const questionVal = mapping.questionCol ? String(row[mapping.questionCol] ?? '').trim() : '';
        const answerVal = mapping.answerCol ? String(row[mapping.answerCol] ?? '').trim() : '';
        const catVal = mapping.categoryCol ? String(row[mapping.categoryCol] ?? '').trim() : '';
        const pinVal = mapping.pinnedCol ? parseBooleanValue(row[mapping.pinnedCol]) : false;

        const isValid = questionVal.length > 0 && answerVal.length > 0;
        let errorReason: string | undefined;
        if (!questionVal && !answerVal) {
            errorReason = 'Trống cả câu hỏi và câu trả lời';
        } else if (!questionVal) {
            errorReason = 'Thiếu nội dung câu hỏi';
        } else if (!answerVal) {
            errorReason = 'Thiếu nội dung câu trả lời';
        }

        return {
            id: generateClientFaqId(),
            question: questionVal,
            answer: answerVal,
            category: catVal || defaultCategory,
            isPinned: pinVal,
            sourceIndex: idx + 2, // Excel row 1-indexed, header is row 1
            isValid,
            errorReason,
        };
    }).filter((item) => item.question || item.answer); // Loại bỏ dòng hoàn toàn trắng
}

/**
 * Phân tích tệp Excel (.xlsx, .xls, .csv)
 */
export async function parseFaqExcel(
    file: File,
    sheetName?: string,
    customMapping?: Partial<FaqColumnMapping>,
    defaultCategory: string = 'Thể lệ & Tham dự',
): Promise<ExcelFaqData> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    if (!workbook.SheetNames.length) {
        throw new Error('Tệp Excel không chứa sheet nào.');
    }

    const targetSheet = sheetName && workbook.SheetNames.includes(sheetName)
        ? sheetName
        : workbook.SheetNames[0];

    const worksheet = workbook.Sheets[targetSheet];
    if (!worksheet) {
        throw new Error(`Không tìm thấy sheet: ${targetSheet}`);
    }

    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: '',
        blankrows: false,
    });

    const headers: string[] = [];
    const headerRow = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
        header: 1,
        blankrows: false,
    })[0] as unknown[] | undefined;

    if (Array.isArray(headerRow)) {
        headerRow.forEach((h) => {
            if (h !== undefined && h !== null && String(h).trim()) {
                headers.push(String(h).trim());
            }
        });
    }

    const detected = detectFaqColumns(headers);
    const finalMapping: FaqColumnMapping = {
        questionCol: customMapping?.questionCol || detected.questionCol,
        answerCol: customMapping?.answerCol || detected.answerCol,
        categoryCol: customMapping?.categoryCol ?? detected.categoryCol,
        pinnedCol: customMapping?.pinnedCol ?? detected.pinnedCol,
    };

    const items = transformExcelRows(rawRows, finalMapping, defaultCategory);

    return {
        sheetNames: workbook.SheetNames,
        currentSheet: targetSheet,
        headers,
        rawRows,
        detectedMapping: finalMapping,
        items,
    };
}

/**
 * Phân tích tệp Word (.docx) bằng cách đọc bảng hoặc đoạn văn Q&A
 */
export async function parseFaqWord(
    file: File,
    defaultCategory: string = 'Thể lệ & Tham dự',
): Promise<WordFaqData> {
    const arrayBuffer = await file.arrayBuffer();
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
    const html = htmlResult.value;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 1. Kiểm tra tài liệu có bảng (Table) không
    const tables = doc.querySelectorAll('table');
    if (tables.length > 0) {
        const tableItems: ParsedFaqItem[] = [];

        tables.forEach((table, tableIdx) => {
            const rows = Array.from(table.querySelectorAll('tr'));
            if (rows.length < 2) return;

            // Xác định header
            const firstRowCells = Array.from(rows[0].querySelectorAll('th, td')).map((c) =>
                c.textContent?.trim() || '',
            );

            let qColIdx = -1;
            let aColIdx = -1;
            let catColIdx = -1;
            let pinColIdx = -1;

            firstRowCells.forEach((text, cIdx) => {
                if (qColIdx === -1 && QUESTION_REGEX.test(text)) qColIdx = cIdx;
                else if (aColIdx === -1 && ANSWER_REGEX.test(text)) aColIdx = cIdx;
                else if (catColIdx === -1 && CATEGORY_REGEX.test(text)) catColIdx = cIdx;
                else if (pinColIdx === -1 && PINNED_REGEX.test(text)) pinColIdx = cIdx;
            });

            const hasExplicitHeaders = qColIdx !== -1 && aColIdx !== -1;
            const startRowIdx = hasExplicitHeaders ? 1 : 0;

            // Fallback nếu không có explicit headers
            if (!hasExplicitHeaders) {
                if (firstRowCells.length >= 2) {
                    qColIdx = 0;
                    aColIdx = 1;
                    if (firstRowCells.length >= 3) catColIdx = 2;
                }
            }

            if (qColIdx !== -1 && aColIdx !== -1) {
                for (let r = startRowIdx; r < rows.length; r++) {
                    const cells = Array.from(rows[r].querySelectorAll('td, th')).map((c) =>
                        c.textContent?.trim() || '',
                    );
                    if (cells.length === 0) continue;

                    const question = cells[qColIdx] || '';
                    const answer = cells[aColIdx] || '';
                    const cat = catColIdx !== -1 ? cells[catColIdx] : '';
                    const pin = pinColIdx !== -1 ? parseBooleanValue(cells[pinColIdx]) : false;

                    if (!question && !answer) continue;

                    const isValid = Boolean(question && answer);
                    tableItems.push({
                        id: generateClientFaqId(),
                        question,
                        answer,
                        category: cat || defaultCategory,
                        isPinned: pin,
                        sourceIndex: `Bảng ${tableIdx + 1}, Dòng ${r + 1}`,
                        isValid,
                        errorReason: isValid ? undefined : !question ? 'Thiếu câu hỏi' : 'Thiếu câu trả lời',
                    });
                }
            }
        });

        if (tableItems.length > 0) {
            return {
                detectedMode: 'TABLE',
                items: tableItems,
            };
        }
    }

    // 2. Không có bảng hoặc bảng không trích xuất được: Phân tích các phần tử văn bản (Headings, Paragraphs)
    const elements = Array.from(doc.body.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li'));
    const qaItems: ParsedFaqItem[] = [];

    let currentCategory = defaultCategory;
    let currentQuestion = '';
    const currentAnswerParts: string[] = [];
    let currentIsPinned = false;

    const flushCurrent = () => {
        if (currentQuestion.trim()) {
            const finalAnswer = currentAnswerParts.join('\n').trim();
            const isValid = currentQuestion.trim().length > 0 && finalAnswer.length > 0;
            qaItems.push({
                id: generateClientFaqId(),
                question: currentQuestion.trim(),
                answer: finalAnswer,
                category: currentCategory,
                isPinned: currentIsPinned,
                sourceIndex: `Mục ${qaItems.length + 1}`,
                isValid,
                errorReason: isValid ? undefined : 'Thiếu câu trả lời',
            });
        }
        currentQuestion = '';
        currentAnswerParts.length = 0;
        currentIsPinned = false;
    };

    // Regex phát hiện bắt đầu câu hỏi và câu trả lời
    const Q_PREFIX_REGEX = /^(?:q(?:uestion)?|hỏi|câu hỏi|câu\s*\d+|bài\s*\d+|\d+[\.\)])\s*[:\-\.]?\s*(.*)$/i;
    const A_PREFIX_REGEX = /^(?:a(?:nswer)?|đáp|trả lời)\s*[:\-\.]?\s*(.*)$/i;

    for (const el of elements) {
        const text = (el.textContent || '').trim();
        if (!text) continue;

        const tagName = el.tagName.toLowerCase();

        // Nếu là Heading lớn <h1>, <h2> -> Coi là danh mục phân loại mới
        if (tagName === 'h1' || tagName === 'h2') {
            flushCurrent();
            if (text.length <= 60 && !text.includes('?')) {
                currentCategory = text.replace(/^(phần|chương|mục|danh mục|chủ đề)\s*\d*[:\-\.]?\s*/i, '').trim();
            }
            continue;
        }

        // Kiểm tra tiền tố câu hỏi
        const qMatch = text.match(Q_PREFIX_REGEX);
        // Kiểm tra tiền tố câu trả lời
        const aMatch = text.match(A_PREFIX_REGEX);

        if (qMatch) {
            flushCurrent();
            currentQuestion = qMatch[1] || text;
        } else if (aMatch) {
            if (currentQuestion) {
                currentAnswerParts.push(aMatch[1] || text);
            }
        } else if (tagName === 'h3' || tagName === 'h4' || el.querySelector('strong, b')) {
            // Tiêu đề nhỏ hoặc in đậm kết thúc bằng dấu ? hoặc ngắn (< 150 ký tự)
            if (text.endsWith('?') || text.length <= 150) {
                flushCurrent();
                currentQuestion = text;
            } else if (currentQuestion) {
                currentAnswerParts.push(text);
            }
        } else {
            // Đoạn văn thông thường
            if (currentQuestion) {
                currentAnswerParts.push(text);
            } else if (text.endsWith('?') && text.length <= 150) {
                currentQuestion = text;
            }
        }
    }

    flushCurrent();

    if (qaItems.length > 0) {
        return {
            detectedMode: 'QA_TEXT',
            items: qaItems,
        };
    }

    // 3. Fallback: Đọc raw text từ mammoth và phân tách theo dòng
    const rawResult = await mammoth.extractRawText({ arrayBuffer });
    const rawLines = rawResult.value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        const qMatch = line.match(Q_PREFIX_REGEX);
        if (qMatch || (line.endsWith('?') && line.length <= 160)) {
            const question = qMatch ? (qMatch[1] || line) : line;
            const answers: string[] = [];
            while (i + 1 < rawLines.length) {
                const nextLine = rawLines[i + 1];
                if (nextLine.match(Q_PREFIX_REGEX) || (nextLine.endsWith('?') && nextLine.length <= 160)) {
                    break;
                }
                const aMatch = nextLine.match(A_PREFIX_REGEX);
                answers.push(aMatch ? (aMatch[1] || nextLine) : nextLine);
                i++;
            }
            const answer = answers.join('\n').trim();
            if (question) {
                qaItems.push({
                    id: generateClientFaqId(),
                    question,
                    answer,
                    category: defaultCategory,
                    isPinned: false,
                    sourceIndex: `Dòng ${i + 1}`,
                    isValid: Boolean(question && answer),
                    errorReason: answer ? undefined : 'Thiếu câu trả lời',
                });
            }
        }
    }

    return {
        detectedMode: 'RAW_TEXT',
        items: qaItems,
    };
}

/**
 * Phân tích tệp chung (tự động nhận diện Excel hay Word)
 */
export async function parseFaqFile(
    file: File,
    defaultCategory: string = 'Thể lệ & Tham dự',
): Promise<FaqParseResult> {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (['xlsx', 'xls', 'csv'].includes(ext)) {
        const excelData = await parseFaqExcel(file, undefined, undefined, defaultCategory);
        const validCount = excelData.items.filter((i) => i.isValid).length;
        return {
            fileType: 'EXCEL',
            fileName: file.name,
            excelData,
            items: excelData.items,
            validCount,
            invalidCount: excelData.items.length - validCount,
        };
    }

    if (['docx', 'doc'].includes(ext)) {
        const wordData = await parseFaqWord(file, defaultCategory);
        const validCount = wordData.items.filter((i) => i.isValid).length;
        return {
            fileType: 'WORD',
            fileName: file.name,
            wordData,
            items: wordData.items,
            validCount,
            invalidCount: wordData.items.length - validCount,
        };
    }

    throw new Error('Định dạng tệp không được hỗ trợ. Vui lòng chọn tệp Excel (.xlsx, .xls, .csv) hoặc Word (.docx).');
}

/**
 * Tải file Excel mẫu chuẩn cho người dùng
 */
export function downloadFaqExcelTemplate(): void {
    const templateData = [
        {
            'Câu hỏi': 'Sinh viên năm nhất chưa có kinh nghiệm có được tham gia sự kiện không?',
            'Câu trả lời': 'Hoàn toàn được! Ban tổ chức luôn chào đón các bạn sinh viên mới tham gia trải nghiệm và học hỏi kỹ năng thực tế.',
            'Danh mục': 'Thể lệ & Tham dự',
            'Ghim ưu tiên': 'Có',
        },
        {
            'Câu hỏi': 'Kinh phí hỗ trợ trang phục và đạo cụ được thanh toán như thế nào?',
            'Câu trả lời': 'Đại diện các đội gửi hóa đơn tài chính hợp lệ và ảnh chụp biên lai thanh toán về Ban Tài chính trước ngày tổng duyệt.',
            'Danh mục': 'Tài chính',
            'Ghim ưu tiên': 'Không',
        },
        {
            'Câu hỏi': 'Thời hạn chốt danh sách thành viên chính thức là khi nào?',
            'Câu trả lời': 'Hạn chốt thay đổi nhân sự là 23:59 ngày trước buổi sơ duyệt một tuần.',
            'Danh mục': 'Thể lệ & Tham dự',
            'Ghim ưu tiên': 'Có',
        },
        {
            'Câu hỏi': 'Khi xảy ra sự cố kỹ thuật về âm thanh hoặc ánh sáng thì liên hệ ai?',
            'Câu trả lời': 'Liên hệ trực tiếp Trưởng ban Kỹ thuật hoặc thông báo qua kênh bộ đàm kênh 2 của Ban Tổ chức.',
            'Danh mục': 'Hậu cần & Kỹ thuật',
            'Ghim ưu tiên': 'Không',
        },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Định dạng độ rộng cột
    worksheet['!cols'] = [
        { wch: 45 }, // Câu hỏi
        { wch: 60 }, // Câu trả lời
        { wch: 22 }, // Danh mục
        { wch: 15 }, // Ghim ưu tiên
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'FAQ_Template');

    XLSX.writeFile(workbook, 'mau_import_faq_project_f.xlsx');
}

/**
 * Chuyển đổi ParsedFaqItem sang CreateFaqRequest để gửi lên API
 */
export function toCreateFaqRequest(item: ParsedFaqItem): CreateFaqRequest {
    return {
        question: item.question.trim(),
        answer: item.answer.trim(),
        category: (item.category || 'Thể lệ & Tham dự').trim(),
        isPinned: Boolean(item.isPinned),
    };
}
