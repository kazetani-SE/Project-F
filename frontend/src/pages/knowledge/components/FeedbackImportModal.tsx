import React, { useState, useEffect, useId, useMemo } from 'react';
import {
    FileSpreadsheet,
    XCircle,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    ArrowLeft,
    Sparkles,
    Star,
    MessageSquareText,
    Tag,
    EyeOff,
    BarChart3,
    Link2,
    Upload,
    Globe,
    HelpCircle,
} from 'lucide-react';
import { useS3Upload } from '../../../hooks/useS3Upload';
import { FileUploader } from '../../../components/common/FileUploader';
import { submitFeedbacksBatch } from '../../../services/knowledgeService';
import { useAuth } from '../../../context/authContext';
import { useActiveEvent } from '../../../context/activeEventContext';
import { useSuccessToast } from '../../../components/ui/toastContext';
import {
    parseExcelFile,
    autoClassifyColumns,
    transformRowsWithQuestionConfigs,
    parseNumericScore,
    isTrivialSuggestionAnswer,
    resolveSpreadsheetExportUrl,
    type ParsedSheetData,
    type QuestionColumnConfig,
} from '../../../utils/excelParser';
import {
    FEEDBACK_SOURCE_LABELS,
    type FeedbackQuestionRole,
    type FeedbackSourceType,
} from '../../../types/models/knowledge';

interface Props {
    eventId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => Promise<void>;
}

const ROLE_CONFIG: Record<
    FeedbackQuestionRole,
    { label: string; badgeClass: string; icon: React.ReactNode }
> = {
    RATING: {
        label: 'Câu hỏi chấm điểm (Rating)',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        icon: <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />,
    },
    SUGGESTION: {
        label: 'Câu hỏi đề xuất / góp ý (Tự luận)',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        icon: <MessageSquareText className="h-3.5 w-3.5 text-emerald-600" />,
    },
    METADATA: {
        label: 'Thông tin / Phân loại (Họ tên, Bảng thi, Vị trí...)',
        badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
        icon: <Tag className="h-3.5 w-3.5 text-blue-600" />,
    },
    IGNORE: {
        label: 'Bỏ qua (Dấu thời gian / Cột trống)',
        badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
        icon: <EyeOff className="h-3.5 w-3.5 text-slate-400" />,
    },
};

export const FeedbackImportModal: React.FC<Props> = ({
    eventId,
    isOpen,
    onClose,
    onSuccess,
}) => {
    const sheetSelectId = useId();
    const sourceSelectId = useId();
    const globalScaleSelectId = useId();
    const formTitleInputId = useId();
    const formPlatformSelectId = useId();
    const formUrlInputId = useId();
    const sheetUrlInputId = useId();

    const { user } = useAuth();
    const { currentEvent } = useActiveEvent();
    const showToast = useSuccessToast();

    const [step, setStep] = useState<1 | 2>(1);
    const [inputMethod, setInputMethod] = useState<'FILE' | 'LINK'>('FILE');
    const [sheetLinkInput, setSheetLinkInput] = useState<string>('');
    const [isFetchingLink, setIsFetchingLink] = useState<boolean>(false);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [defaultSource, setDefaultSource] = useState<FeedbackSourceType>('ATTENDEE');
    const [formTitle, setFormTitle] = useState<string>('');
    const [formPlatform, setFormPlatform] = useState<string>('Google Forms');
    const [formUrl, setFormUrl] = useState<string>('');

    // Excel parsed data
    const [isParsing, setIsParsing] = useState(false);
    const [parsedData, setParsedData] = useState<ParsedSheetData | null>(null);
    const [selectedSheet, setSelectedSheet] = useState<string>('');

    // Question column configurations
    const [columnConfigs, setColumnConfigs] = useState<QuestionColumnConfig[]>([]);

    // Processing & upload
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const { isUploading, progress, uploadFile } = useS3Upload();

    // Reset when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setStep(1);
            setInputMethod('FILE');
            setSheetLinkInput('');
            setIsFetchingLink(false);
            setSelectedFile(null);
            setParsedData(null);
            setSelectedSheet('');
            setColumnConfigs([]);
            setErrorMessage(null);
            setIsSubmitting(false);
            setFormTitle('');
            setFormPlatform('Google Forms');
            setFormUrl('');
        }
    }, [isOpen]);

    // Handle file selection and parsing
    const handleFileSelect = async (file: File | null) => {
        setSelectedFile(file);
        setErrorMessage(null);
        if (!file) {
            setParsedData(null);
            setColumnConfigs([]);
            return;
        }

        setIsParsing(true);
        try {
            const data = await parseExcelFile(file);
            setParsedData(data);
            setSelectedSheet(data.currentSheet);
            const classified = autoClassifyColumns(data.headers, data.rawRows);
            setColumnConfigs(classified);
            const eventName = currentEvent?.name || 'Sự kiện';
            const lowerName = file.name.toLowerCase();
            if (lowerName.includes('btc') || lowerName.includes('organizer')) {
                setDefaultSource('ORGANIZER');
                setFormTitle(`Đánh giá nội bộ BTC · ${eventName}`);
            } else if (lowerName.includes('tai_tro') || lowerName.includes('sponsor')) {
                setDefaultSource('SPONSOR');
                setFormTitle(`Phản hồi đối tác tài trợ · ${eventName}`);
            } else if (lowerName.includes('dien_gia') || lowerName.includes('speaker')) {
                setDefaultSource('SPEAKER');
                setFormTitle(`Phản hồi diễn giả & mentor · ${eventName}`);
            } else {
                setFormTitle(`Khảo sát ${FEEDBACK_SOURCE_LABELS[defaultSource].toLowerCase()} · ${eventName}`);
            }
            if (lowerName.includes('ms_forms') || lowerName.includes('microsoft')) {
                setFormPlatform('Microsoft Forms');
            } else {
                setFormPlatform('Google Forms');
            }
        } catch (err: unknown) {
            setErrorMessage(err instanceof Error ? err.message : 'Không thể đọc tệp Excel/CSV');
            setParsedData(null);
            setColumnConfigs([]);
        } finally {
            setIsParsing(false);
        }
    };

    // Handle fetching directly from Google Sheets / OneDrive / Direct XLSX-CSV link
    const handleFetchFromLink = async () => {
        setErrorMessage(null);
        let resolved: ReturnType<typeof resolveSpreadsheetExportUrl>;
        try {
            resolved = resolveSpreadsheetExportUrl(sheetLinkInput);
        } catch (err: unknown) {
            setErrorMessage(
                err instanceof Error ? err.message : 'Đường dẫn trang tính không hợp lệ.',
            );
            return;
        }

        setIsFetchingLink(true);
        try {
            const response = await fetch(resolved.exportUrl);
            if (!response.ok) {
                throw new Error(
                    `Không thể tải trang tính (HTTP ${response.status}). Hãy đảm bảo quyền chia sẻ đã bật "Bất kỳ ai có liên kết đều có thể xem".`,
                );
            }
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('text/html')) {
                throw new Error(
                    'Trang tính này đang ở chế độ Riêng tư (Private). Vui lòng mở Google Sheets / OneDrive -> Bấm "Chia sẻ" (Share) -> Chọn "Bất kỳ ai có liên kết đều có thể xem" (Anyone with the link can view).',
                );
            }

            const blob = await response.blob();
            const fetchedFile = new File([blob], resolved.fileName, {
                type:
                    blob.type ||
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });

            await handleFileSelect(fetchedFile);
            setFormPlatform(resolved.platform);
            setFormUrl(sheetLinkInput.trim());
        } catch (err: unknown) {
            const rawMsg = err instanceof Error ? err.message : '';
            if (rawMsg.includes('Failed to fetch') || rawMsg.includes('NetworkError')) {
                setErrorMessage(
                    'Trình duyệt không thể tải trực tiếp liên kết này (do trang tính chưa bật chia sẻ công khai "Bất kỳ ai có liên kết" hoặc bị chặn CORS). Hãy kiểm tra quyền Chia sẻ của Google Sheets hoặc tải tệp .xlsx về máy.',
                );
            } else {
                setErrorMessage(
                    rawMsg || 'Không thể lấy dữ liệu từ đường dẫn đã nhập.',
                );
            }
        } finally {
            setIsFetchingLink(false);
        }
    };

    // Handle sheet change
    const handleSheetChange = async (sheetName: string) => {
        if (!selectedFile) return;
        setSelectedSheet(sheetName);
        setIsParsing(true);
        try {
            const data = await parseExcelFile(selectedFile, sheetName);
            setParsedData(data);
            const classified = autoClassifyColumns(data.headers, data.rawRows);
            setColumnConfigs(classified);
        } catch (err: unknown) {
            setErrorMessage(err instanceof Error ? err.message : 'Không thể đọc sheet đã chọn');
        } finally {
            setIsParsing(false);
        }
    };

    const handleRoleChange = (rawHeader: string, newRole: FeedbackQuestionRole) => {
        setColumnConfigs((prev) =>
            prev.map((c) => (c.rawHeader === rawHeader ? { ...c, role: newRole } : c)),
        );
    };

    const handleScaleChange = (rawHeader: string, newScale: number) => {
        setColumnConfigs((prev) =>
            prev.map((c) => (c.rawHeader === rawHeader ? { ...c, scaleMax: newScale } : c)),
        );
    };

    const handleApplyGlobalScale = (newScale: number) => {
        setColumnConfigs((prev) =>
            prev.map((c) => (c.role === 'RATING' ? { ...c, scaleMax: newScale } : c)),
        );
    };

    // Live preview stats for Step 2
    const previewStats = useMemo(() => {
        if (!parsedData) {
            return {
                ratingPreview: [],
                suggestionCount: 0,
                meaningfulSuggestionAnswers: 0,
                metadataCount: 0,
            };
        }

        const ratingCols = columnConfigs.filter((c) => c.role === 'RATING');
        const suggestionCols = columnConfigs.filter((c) => c.role === 'SUGGESTION');
        const metadataCols = columnConfigs.filter((c) => c.role === 'METADATA');

        const ratingPreview = ratingCols.map((col) => {
            const scores: number[] = [];
            for (const row of parsedData.rawRows) {
                const s = parseNumericScore(row[col.rawHeader], col.scaleMax);
                if (s !== null) scores.push(s);
            }
            const avg =
                scores.length > 0
                    ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
                    : 0;
            return {
                rawHeader: col.rawHeader,
                questionLabel: col.questionLabel,
                scaleMax: col.scaleMax,
                avg,
                count: scores.length,
            };
        });

        let meaningfulSuggestionAnswers = 0;
        const uniqueSuggestionQuestions = new Set(suggestionCols.map((c) => c.questionLabel));
        for (const row of parsedData.rawRows) {
            for (const col of suggestionCols) {
                const val = row[col.rawHeader];
                if (val !== '' && val !== null && val !== undefined) {
                    const str = String(val).trim();
                    if (str && !isTrivialSuggestionAnswer(str)) {
                        meaningfulSuggestionAnswers += 1;
                    }
                }
            }
        }

        return {
            ratingPreview,
            suggestionCount: uniqueSuggestionQuestions.size,
            meaningfulSuggestionAnswers,
            metadataCount: metadataCols.length,
        };
    }, [parsedData, columnConfigs]);

    // Step 1 to Step 2 validation
    const handleProceedToStep2 = () => {
        if (!selectedFile || !parsedData) {
            setErrorMessage('Vui lòng chọn tệp Excel/CSV hợp lệ');
            return;
        }
        if (parsedData.rawRows.length === 0) {
            setErrorMessage('Tệp Excel được chọn không chứa dòng phản hồi hợp lệ nào.');
            return;
        }
        setErrorMessage(null);
        setStep(2);
    };

    // Execute upload to S3 and batch save to database
    const handleImportSubmit = async () => {
        if (!selectedFile || !parsedData) return;

        const activeCols = columnConfigs.filter((c) => c.role !== 'IGNORE');
        if (activeCols.length === 0) {
            setErrorMessage('Vui lòng giữ lại ít nhất 1 câu hỏi chấm điểm hoặc câu hỏi đề xuất.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            // 1. Upload original Excel file to Amazon S3
            const uploadRes = await uploadFile(selectedFile, 'FEEDBACK');
            const fileUrl = uploadRes.fileUrl;

            // 2. Transform rows to batch requests with structured questions & ratings
            const requests = transformRowsWithQuestionConfigs(
                parsedData.rawRows,
                columnConfigs,
                fileUrl,
                defaultSource,
                {
                    formTitle:
                        formTitle.trim() ||
                        `Khảo sát ${FEEDBACK_SOURCE_LABELS[defaultSource].toLowerCase()} · ${currentEvent?.name || 'Sự kiện'}`,
                    formPlatform,
                    formUrl: formUrl.trim() || undefined,
                    importedBy: user?.fullName || 'Người dùng hiện tại',
                    skippedRows: parsedData.skippedSummaryRows,
                },
            );

            if (requests.length === 0) {
                throw new Error('Không có dòng phản hồi hợp lệ nào để import.');
            }

            // 3. Save batch in database
            await submitFeedbacksBatch(eventId, requests);

            // 4. Refresh parent view and close
            showToast(`Đã import thành công ${requests.length} phản hồi khảo sát!`);
            await onSuccess();
            onClose();
        } catch (err: unknown) {
            setErrorMessage(
                err instanceof Error ? err.message : 'Lỗi trong quá trình import dữ liệu',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const ratingColCount = columnConfigs.filter((c) => c.role === 'RATING').length;
    const dominantScale =
        columnConfigs.find((c) => c.role === 'RATING')?.scaleMax || 5;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-emerald-100 p-2 text-emerald-800">
                            <FileSpreadsheet className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">
                                Import Khảo Sát Theo Câu Hỏi & Thang Điểm (Excel / CSV)
                            </h3>
                            <p className="text-xs text-slate-500">
                                Bước {step}/2:{' '}
                                {step === 1
                                    ? 'Chọn tệp & bảng tính khảo sát'
                                    : 'Cấu hình danh sách câu hỏi, thang điểm & xem trước thống kê'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSubmitting || isUploading}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-50"
                    >
                        <XCircle className="h-5 w-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {errorMessage && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700">
                            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-4">
                            {/* Segmented Input Method Switcher: Upload File vs Paste Google Sheets / Online Link */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
                                <span className="text-xs font-semibold text-slate-700">
                                    Phương thức lấy dữ liệu khảo sát:
                                </span>
                                <div className="inline-flex items-center rounded-xl bg-slate-100 p-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setInputMethod('FILE');
                                            setErrorMessage(null);
                                        }}
                                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                                            inputMethod === 'FILE'
                                                ? 'bg-white text-emerald-700 shadow-2xs'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <Upload className="h-3.5 w-3.5" />
                                        <span>Tải tệp từ máy (.xlsx, .csv)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setInputMethod('LINK');
                                            setErrorMessage(null);
                                        }}
                                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                                            inputMethod === 'LINK'
                                                ? 'bg-white text-emerald-700 shadow-2xs'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <Link2 className="h-3.5 w-3.5" />
                                        <span>Dán link Google Sheets / OneDrive</span>
                                    </button>
                                </div>
                            </div>

                            {inputMethod === 'FILE' ? (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                        Chọn tệp kết quả xuất từ Form (Google Forms, Microsoft Forms, CSV) *
                                    </label>
                                    <FileUploader
                                        category="FEEDBACK"
                                        selectedFile={selectedFile}
                                        onFileSelect={handleFileSelect}
                                        isUploading={isParsing}
                                        progress={0}
                                        error={null}
                                        description="Hỗ trợ .xlsx, .xls, .csv (Tối đa 15MB theo quy định bảo mật hệ thống)"
                                    />
                                </div>
                            ) : (
                                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3.5">
                                    <div>
                                        <label
                                            htmlFor={sheetUrlInputId}
                                            className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1.5"
                                        >
                                            <Globe className="h-3.5 w-3.5 text-emerald-600" />
                                            <span>
                                                Đường dẫn Google Sheets hoặc OneDrive Excel liên kết với Form *
                                            </span>
                                        </label>

                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <input
                                                id={sheetUrlInputId}
                                                type="url"
                                                value={sheetLinkInput}
                                                onChange={(e) => setSheetLinkInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleFetchFromLink();
                                                    }
                                                }}
                                                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                                                className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-hidden"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleFetchFromLink}
                                                disabled={
                                                    !sheetLinkInput.trim() ||
                                                    isFetchingLink ||
                                                    isParsing
                                                }
                                                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-800 transition-colors disabled:opacity-50 shrink-0"
                                            >
                                                {isFetchingLink ? (
                                                    <>
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        <span>Đang tải bảng tính...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Link2 className="h-3.5 w-3.5" />
                                                        <span>Lấy dữ liệu từ Link</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Quick 2-step guide on how to get the link from Google Forms / MS Forms */}
                                    <div className="rounded-lg bg-white border border-slate-200/80 p-3 text-[11px] text-slate-600 space-y-1.5">
                                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                            <HelpCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                            <span>
                                                Cách lấy link kéo dữ liệu trực tiếp (không cần tải file về máy):
                                            </span>
                                        </div>
                                        <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-0.5">
                                            <li>
                                                Trong <strong>Google Forms</strong> (tab{' '}
                                                <em>Câu trả lời / Responses</em>), bấm{' '}
                                                <strong>Liên kết với Trang tính (Link to Sheets)</strong>.
                                            </li>
                                            <li>
                                                Mở file Google Sheets đó, bấm nút{' '}
                                                <strong>Chia sẻ (Share)</strong> ở góc phải &rarr;
                                                chọn{' '}
                                                <strong className="text-emerald-700">
                                                    Bất kỳ ai có liên kết đều có thể xem (Anyone with
                                                    the link can view)
                                                </strong>{' '}
                                                rồi copy link dán vào ô trên.
                                            </li>
                                        </ol>
                                    </div>
                                </div>
                            )}

                            {(isParsing || isFetchingLink) && (
                                <div className="flex items-center justify-center gap-2 py-4 text-xs font-semibold text-emerald-700">
                                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                                    <span>
                                        {isFetchingLink
                                            ? 'Đang kết nối và kéo dữ liệu trực tiếp từ liên kết trang tính...'
                                            : 'Đang đọc bảng tính, phân loại câu hỏi và nhận diện thang điểm...'}
                                    </span>
                                </div>
                            )}

                            {parsedData && (
                                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-3">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            <span>
                                                Đã đọc thành công: {parsedData.totalRows} phiếu phản hồi hợp lệ
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                                            <span>{parsedData.headers.length} cột câu hỏi</span>
                                            {parsedData.skippedSummaryRows > 0 && (
                                                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-amber-800">
                                                    Đã tự động lọc bỏ {parsedData.skippedSummaryRows} dòng công thức tổng kết (AVERAGE/SUM)
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {parsedData.sheetNames.length > 1 && (
                                        <div>
                                            <label
                                                htmlFor={sheetSelectId}
                                                className="block text-xs font-medium text-slate-700 mb-1"
                                            >
                                                Chọn Sheet chứa dữ liệu khảo sát:
                                            </label>
                                            <select
                                                id={sheetSelectId}
                                                value={selectedSheet}
                                                onChange={(e) => handleSheetChange(e.target.value)}
                                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                                            >
                                                {parsedData.sheetNames.map((s) => (
                                                    <option key={s} value={s}>
                                                        {s}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label
                                                htmlFor={formTitleInputId}
                                                className="block text-xs font-medium text-slate-700 mb-1"
                                            >
                                                Tên đợt / Form khảo sát:
                                            </label>
                                            <input
                                                id={formTitleInputId}
                                                type="text"
                                                value={formTitle}
                                                onChange={(e) => setFormTitle(e.target.value)}
                                                placeholder="VD: Khảo sát người tham dự · Orientation Day K21"
                                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                                            />
                                        </div>

                                        <div>
                                            <label
                                                htmlFor={sourceSelectId}
                                                className="block text-xs font-medium text-slate-700 mb-1"
                                            >
                                                Nhóm đối tượng khảo sát:
                                            </label>
                                            <select
                                                id={sourceSelectId}
                                                value={defaultSource}
                                                onChange={(e) =>
                                                    setDefaultSource(e.target.value as FeedbackSourceType)
                                                }
                                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                                            >
                                                {Object.entries(FEEDBACK_SOURCE_LABELS).map(([k, v]) => (
                                                    <option key={k} value={k}>
                                                        {v} ({k})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label
                                                htmlFor={formPlatformSelectId}
                                                className="block text-xs font-medium text-slate-700 mb-1"
                                            >
                                                Nền tảng thu thập:
                                            </label>
                                            <select
                                                id={formPlatformSelectId}
                                                value={formPlatform}
                                                onChange={(e) => setFormPlatform(e.target.value)}
                                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                                            >
                                                <option value="Google Forms">Google Forms</option>
                                                <option value="Microsoft Forms">Microsoft Forms</option>
                                                <option value="CSV / Excel">CSV / Excel</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label
                                                htmlFor={formUrlInputId}
                                                className="block text-xs font-medium text-slate-700 mb-1"
                                            >
                                                Đường dẫn Form gốc (Tùy chọn):
                                            </label>
                                            <input
                                                id={formUrlInputId}
                                                type="url"
                                                value={formUrl}
                                                onChange={(e) => setFormUrl(e.target.value)}
                                                placeholder="https://docs.google.com/forms/..."
                                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && parsedData && (
                        <div className="space-y-5">
                            {/* Top Banner & Global Scale Quick Switcher */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-700 border border-slate-200">
                                <div className="flex items-start gap-2.5">
                                    <Sparkles className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-slate-800">
                                            Đã tự động phân loại { ratingColCount } câu hỏi chấm điểm &{' '}
                                            { previewStats.suggestionCount } câu hỏi đề xuất/góp ý
                                        </p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                            Các câu hỏi trùng tên do rẽ nhánh trong Google Form (như hậu tố &quot; 2&quot;) sẽ tự động được gộp chung.
                                        </p>
                                    </div>
                                </div>

                                {ratingColCount > 0 && (
                                    <div className="flex items-center gap-2 shrink-0 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                                        <label
                                            htmlFor={globalScaleSelectId}
                                            className="text-[11px] font-semibold text-slate-600"
                                        >
                                            Thang điểm chung:
                                        </label>
                                        <select
                                            id={globalScaleSelectId}
                                            value={dominantScale}
                                            onChange={(e) =>
                                                handleApplyGlobalScale(Number(e.target.value))
                                            }
                                            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-amber-700 focus:border-emerald-500 focus:outline-hidden"
                                        >
                                            <option value={5}>Thang 5 điểm (1 - 5)</option>
                                            <option value={10}>Thang 10 điểm (1 - 10)</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Live Preview of Rating Questions */}
                            {previewStats.ratingPreview.length > 0 && (
                                <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                                            <BarChart3 className="h-4 w-4 text-amber-600" />
                                            <span>
                                                Xem trước Điểm Trung Bình Từng Câu Hỏi ({previewStats.ratingPreview.length} tiêu chí)
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-amber-700 font-medium">
                                            {previewStats.meaningfulSuggestionAnswers} ý kiến đề xuất chi tiết được ghi nhận
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                        {previewStats.ratingPreview.map((item) => {
                                            const pct = Math.min(
                                                100,
                                                Math.round((item.avg / item.scaleMax) * 100),
                                            );
                                            return (
                                                <div
                                                    key={item.rawHeader}
                                                    className="rounded-xl bg-white p-3 border border-amber-100 shadow-2xs flex flex-col justify-between gap-2"
                                                >
                                                    <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                                                        {item.questionLabel}
                                                    </p>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="text-[11px] text-slate-400">
                                                                {item.count} lượt chấm
                                                            </span>
                                                            <span className="font-extrabold text-amber-700">
                                                                {item.avg.toFixed(2)} / {item.scaleMax} điểm
                                                            </span>
                                                        </div>
                                                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full bg-amber-400"
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Question Columns Configuration Table */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                                    <span>
                                        Danh sách các cột câu hỏi trong tệp ({columnConfigs.length} cột):
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                        Bạn có thể đổi vai trò câu hỏi hoặc thang điểm nếu muốn
                                    </span>
                                </div>

                                <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                                    {columnConfigs.map((col, idx) => {
                                        const cfg = ROLE_CONFIG[col.role];
                                        const isMergedBranch = col.rawHeader.trim() !== col.questionLabel;
                                        return (
                                            <div
                                                key={col.rawHeader}
                                                className={`p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                                                    col.role === 'IGNORE'
                                                        ? 'bg-slate-50/60 opacity-60'
                                                        : 'hover:bg-slate-50/80'
                                                }`}
                                            >
                                                <div className="space-y-1 flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-[11px] font-mono text-slate-400">
                                                            #{idx + 1}
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-800 break-words">
                                                            {col.questionLabel}
                                                        </span>
                                                        {isMergedBranch && (
                                                            <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-200">
                                                                Gộp nhánh từ: &quot;{col.rawHeader.trim()}&quot;
                                                            </span>
                                                        )}
                                                    </div>

                                                    {col.sampleValues.length > 0 ? (
                                                        <p className="text-[11px] text-slate-500 truncate">
                                                            Mẫu trả lời:{' '}
                                                            <span className="italic text-slate-600">
                                                                {col.sampleValues.join(' • ')}
                                                            </span>
                                                        </p>
                                                    ) : (
                                                        <p className="text-[11px] text-slate-400 italic">
                                                            (Cột không có dữ liệu)
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Controls for Role & Scale */}
                                                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                                    <div
                                                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${cfg.badgeClass}`}
                                                    >
                                                        {cfg.icon}
                                                        <select
                                                            aria-label={`Vai trò cho câu hỏi ${col.questionLabel}`}
                                                            value={col.role}
                                                            onChange={(e) =>
                                                                handleRoleChange(
                                                                    col.rawHeader,
                                                                    e.target.value as FeedbackQuestionRole,
                                                                )
                                                            }
                                                            className="bg-transparent font-semibold focus:outline-hidden cursor-pointer"
                                                        >
                                                            <option value="RATING">
                                                                Câu hỏi Chấm điểm (Rating)
                                                            </option>
                                                            <option value="SUGGESTION">
                                                                Đề xuất / Góp ý (Tự luận)
                                                            </option>
                                                            <option value="METADATA">
                                                                Thông tin / Phân loại
                                                            </option>
                                                            <option value="IGNORE">
                                                                Bỏ qua cột này
                                                            </option>
                                                        </select>
                                                    </div>

                                                    {col.role === 'RATING' && (
                                                        <select
                                                            aria-label={`Thang điểm cho câu hỏi ${col.questionLabel}`}
                                                            value={col.scaleMax}
                                                            onChange={(e) =>
                                                                handleScaleChange(
                                                                    col.rawHeader,
                                                                    Number(e.target.value),
                                                                )
                                                            }
                                                            className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-bold text-amber-800 focus:border-emerald-500 focus:outline-hidden"
                                                        >
                                                            <option value={5}>Thang 5</option>
                                                            <option value={10}>Thang 10</option>
                                                        </select>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50/50">
                    {step === 1 ? (
                        <>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-white transition-colors"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                onClick={handleProceedToStep2}
                                disabled={!selectedFile || !parsedData || isParsing}
                                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                            >
                                <span>
                                    Tiếp tục: Xem câu hỏi & thang điểm ({parsedData?.totalRows || 0} phiếu)
                                </span>
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                disabled={isSubmitting || isUploading}
                                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-white transition-colors disabled:opacity-50"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                <span>Quay lại bước 1</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleImportSubmit}
                                disabled={isSubmitting || isUploading}
                                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-xs"
                            >
                                {(isSubmitting || isUploading) && (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                )}
                                <span>
                                    {isUploading
                                        ? `Đang đẩy tệp lên Amazon S3 (${progress}%)...`
                                        : isSubmitting
                                          ? 'Đang lưu vào CSDL...'
                                          : `Xác nhận Import (${parsedData?.totalRows} phiếu phản hồi)`}
                                </span>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
