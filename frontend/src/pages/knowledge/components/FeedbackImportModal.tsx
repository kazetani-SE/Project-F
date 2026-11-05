import React, { useState, useEffect, useId } from 'react';
import {
    FileSpreadsheet,
    XCircle,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    ArrowLeft,
    Sparkles,
    Eye,
} from 'lucide-react';
import { useS3Upload } from '../../../hooks/useS3Upload';
import { FileUploader } from '../../../components/common/FileUploader';
import { submitFeedbacksBatch } from '../../../services/knowledgeService';
import {
    parseExcelFile,
    autoDetectFeedbackMapping,
    transformRowsToFeedbackRequests,
    type ParsedSheetData,
    type FeedbackColumnMapping,
} from '../../../utils/excelParser';
import {
    FEEDBACK_SOURCE_LABELS,
    type FeedbackSourceType,
} from '../../../types/models/knowledge';

interface Props {
    eventId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => Promise<void>;
}

export const FeedbackImportModal: React.FC<Props> = ({
    eventId,
    isOpen,
    onClose,
    onSuccess,
}) => {
    const sheetSelectId = useId();
    const sourceSelectId = useId();
    const ratingSelectId = useId();
    const highlightSelectId = useId();
    const improvementSelectId = useId();
    const sourceColSelectId = useId();

    const [step, setStep] = useState<1 | 2>(1);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [defaultSource, setDefaultSource] = useState<FeedbackSourceType>('ATTENDEE');

    // Excel parsed data
    const [isParsing, setIsParsing] = useState(false);
    const [parsedData, setParsedData] = useState<ParsedSheetData | null>(null);
    const [selectedSheet, setSelectedSheet] = useState<string>('');

    // Mapping columns
    const [mapping, setMapping] = useState<FeedbackColumnMapping>({});

    // Processing & upload
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const { isUploading, progress, uploadFile } = useS3Upload();

    // Reset when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setStep(1);
            setSelectedFile(null);
            setParsedData(null);
            setSelectedSheet('');
            setMapping({});
            setErrorMessage(null);
            setIsSubmitting(false);
        }
    }, [isOpen]);

    // Handle file selection and parsing
    const handleFileSelect = async (file: File | null) => {
        setSelectedFile(file);
        setErrorMessage(null);
        if (!file) {
            setParsedData(null);
            return;
        }

        setIsParsing(true);
        try {
            const data = await parseExcelFile(file);
            setParsedData(data);
            setSelectedSheet(data.currentSheet);
            const detected = autoDetectFeedbackMapping(data.headers);
            setMapping(detected);
        } catch (err: unknown) {
            setErrorMessage(err instanceof Error ? err.message : 'Không thể đọc tệp Excel/CSV');
            setParsedData(null);
        } finally {
            setIsParsing(false);
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
            const detected = autoDetectFeedbackMapping(data.headers);
            setMapping(detected);
        } catch (err: unknown) {
            setErrorMessage(err instanceof Error ? err.message : 'Không thể đọc sheet đã chọn');
        } finally {
            setIsParsing(false);
        }
    };

    // Step 1 to Step 2 validation
    const handleProceedToStep2 = () => {
        if (!selectedFile || !parsedData) {
            setErrorMessage('Vui lòng chọn tệp Excel/CSV hợp lệ');
            return;
        }
        if (parsedData.rawRows.length === 0) {
            setErrorMessage('Tệp Excel được chọn không chứa dữ liệu dòng nào.');
            return;
        }
        setErrorMessage(null);
        setStep(2);
    };

    // Execute upload to S3 and batch save to database
    const handleImportSubmit = async () => {
        if (!selectedFile || !parsedData) return;
        if (!mapping.ratingScoreColumn) {
            setErrorMessage('Vui lòng chọn cột chứa Điểm đánh giá (1-5 sao)');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            // 1. Upload original Excel file to Amazon S3
            const uploadRes = await uploadFile(selectedFile, 'FEEDBACK');
            const fileUrl = uploadRes.fileUrl;

            // 2. Transform rows to batch requests
            const requests = transformRowsToFeedbackRequests(
                parsedData.rawRows,
                mapping,
                fileUrl,
                defaultSource,
            );

            if (requests.length === 0) {
                throw new Error('Không có dòng phản hồi hợp lệ nào để import.');
            }

            // 3. Save batch in database
            await submitFeedbacksBatch(eventId, requests);

            // 4. Refresh parent view and close
            await onSuccess();
            onClose();
        } catch (err: unknown) {
            setErrorMessage(err instanceof Error ? err.message : 'Lỗi trong quá trình import dữ liệu');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    // Preview rows for step 2
    const previewRows = parsedData ? parsedData.rawRows.slice(0, 4) : [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-emerald-100 p-2 text-emerald-800">
                            <FileSpreadsheet className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">
                                Import Khảo Sát Từ Tệp Form (Excel / CSV)
                            </h3>
                            <p className="text-xs text-slate-500">
                                Bước {step}/2: {step === 1 ? 'Chọn tệp & bảng tính khảo sát' : 'Ghép cột dữ liệu & Xác nhận import'}
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

                            {isParsing && (
                                <div className="flex items-center justify-center gap-2 py-4 text-xs font-semibold text-emerald-700">
                                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                                    <span>Đang đọc cấu trúc bảng tính và phân tích tiêu đề cột...</span>
                                </div>
                            )}

                            {parsedData && (
                                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            <span>Đã đọc thành công tệp: {parsedData.totalRows} dòng phản hồi</span>
                                        </div>
                                        <span className="text-[11px] font-semibold text-slate-500">
                                            {parsedData.headers.length} cột phát hiện
                                        </span>
                                    </div>

                                    {parsedData.sheetNames.length > 1 && (
                                        <div>
                                            <label htmlFor={sheetSelectId} className="block text-xs font-medium text-slate-700 mb-1">
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

                                    <div>
                                        <label htmlFor={sourceSelectId} className="block text-xs font-medium text-slate-700 mb-1">
                                            Nhóm đối tượng khảo sát mặc định:
                                        </label>
                                        <select
                                            id={sourceSelectId}
                                            value={defaultSource}
                                            onChange={(e) => setDefaultSource(e.target.value as FeedbackSourceType)}
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                                        >
                                            {Object.entries(FEEDBACK_SOURCE_LABELS).map(([k, v]) => (
                                                <option key={k} value={k}>
                                                    {v} ({k})
                                                </option>
                                            ))}
                                        </select>
                                        <p className="mt-1 text-[11px] text-slate-500">
                                            (Được áp dụng cho các dòng không có cột phân loại riêng trong bảng tính)
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && parsedData && (
                        <div className="space-y-5">
                            {/* Auto Detect Notice */}
                            <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200">
                                <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                                <span>
                                    Hệ thống đã tự động đối chiếu các câu hỏi phổ biến từ Form khảo sát. Bạn có thể thay đổi lại nếu cần:
                                </span>
                            </div>

                            {/* Column Mapping Selectors */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                <div className="rounded-xl border border-slate-200 p-3.5 bg-white space-y-1">
                                    <label htmlFor={ratingSelectId} className="block text-xs font-bold text-slate-800">
                                        Cột Điểm Đánh Giá (Rating 1-5★) <span className="text-rose-500">*</span>
                                    </label>
                                    <p className="text-[11px] text-slate-500">
                                        Thang điểm số (1-5), số sao hoặc mức độ hài lòng
                                    </p>
                                    <select
                                        id={ratingSelectId}
                                        value={mapping.ratingScoreColumn || ''}
                                        onChange={(e) => setMapping((prev) => ({ ...prev, ratingScoreColumn: e.target.value }))}
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                                    >
                                        <option value="">-- Chọn cột điểm đánh giá --</option>
                                        {parsedData.headers.map((h) => (
                                            <option key={h} value={h}>
                                                {h}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="rounded-xl border border-slate-200 p-3.5 bg-white space-y-1">
                                    <label htmlFor={highlightSelectId} className="block text-xs font-bold text-slate-800">
                                        Cột Điểm Sáng Nổi Bật (Highlight)
                                    </label>
                                    <p className="text-[11px] text-slate-500">
                                        Điều hài lòng nhất, khen ngợi, điểm cộng của sự kiện
                                    </p>
                                    <select
                                        id={highlightSelectId}
                                        value={mapping.highlightContentColumn || ''}
                                        onChange={(e) => setMapping((prev) => ({ ...prev, highlightContentColumn: e.target.value }))}
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                                    >
                                        <option value="">-- Không ánh xạ / Bỏ qua --</option>
                                        {parsedData.headers.map((h) => (
                                            <option key={h} value={h}>
                                                {h}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="rounded-xl border border-slate-200 p-3.5 bg-white space-y-1">
                                    <label htmlFor={improvementSelectId} className="block text-xs font-bold text-slate-800">
                                        Cột Đề Xuất Cải Tiến (Improvement)
                                    </label>
                                    <p className="text-[11px] text-slate-500">
                                        Góp ý, vấn đề cần khắc phục cho các mùa sau
                                    </p>
                                    <select
                                        id={improvementSelectId}
                                        value={mapping.improvementContentColumn || ''}
                                        onChange={(e) => setMapping((prev) => ({ ...prev, improvementContentColumn: e.target.value }))}
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                                    >
                                        <option value="">-- Không ánh xạ / Bỏ qua --</option>
                                        {parsedData.headers.map((h) => (
                                            <option key={h} value={h}>
                                                {h}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="rounded-xl border border-slate-200 p-3.5 bg-white space-y-1">
                                    <label htmlFor={sourceColSelectId} className="block text-xs font-bold text-slate-800">
                                        Cột Phân Nhóm Đối Tượng (Tùy chọn)
                                    </label>
                                    <p className="text-[11px] text-slate-500">
                                        Cột &quot;Bạn tham gia với vai trò nào?&quot; (mặc định: {FEEDBACK_SOURCE_LABELS[defaultSource]})
                                    </p>
                                    <select
                                        id={sourceColSelectId}
                                        value={mapping.sourceTypeColumn || ''}
                                        onChange={(e) => setMapping((prev) => ({ ...prev, sourceTypeColumn: e.target.value }))}
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                                    >
                                        <option value="">-- Áp dụng nhóm mặc định ({FEEDBACK_SOURCE_LABELS[defaultSource]}) --</option>
                                        {parsedData.headers.map((h) => (
                                            <option key={h} value={h}>
                                                {h}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Data Preview Table */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                                    <span className="flex items-center gap-1.5">
                                        <Eye className="h-4 w-4 text-slate-500" />
                                        Xem trước dữ liệu ({previewRows.length}/{parsedData.totalRows} dòng):
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                        Các cột câu hỏi phụ còn lại sẽ tự động lưu vào PostgreSQL JSONB
                                    </span>
                                </div>

                                <div className="max-h-48 overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 text-[11px]">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 bg-slate-100 text-slate-600 border-b border-slate-200">
                                            <tr>
                                                <th className="p-2 font-bold w-12">#</th>
                                                <th className="p-2 font-bold text-emerald-800">Điểm (Rating)</th>
                                                <th className="p-2 font-bold">Điểm sáng</th>
                                                <th className="p-2 font-bold">Cải tiến</th>
                                                <th className="p-2 font-bold">Đối tượng</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 bg-white">
                                            {previewRows.map((row, idx) => {
                                                const ratingRaw = mapping.ratingScoreColumn ? row[mapping.ratingScoreColumn] : '-';
                                                const hlRaw = mapping.highlightContentColumn ? row[mapping.highlightContentColumn] : '-';
                                                const impRaw = mapping.improvementContentColumn ? row[mapping.improvementContentColumn] : '-';
                                                const srcRaw = mapping.sourceTypeColumn ? row[mapping.sourceTypeColumn] : FEEDBACK_SOURCE_LABELS[defaultSource];
                                                return (
                                                    <tr key={idx} className="hover:bg-slate-50">
                                                        <td className="p-2 text-slate-400 font-mono">{idx + 1}</td>
                                                        <td className="p-2 font-bold text-emerald-700">{String(ratingRaw || '-')}</td>
                                                        <td className="p-2 text-slate-700 max-w-xs truncate">{String(hlRaw || '-')}</td>
                                                        <td className="p-2 text-slate-700 max-w-xs truncate">{String(impRaw || '-')}</td>
                                                        <td className="p-2 text-slate-500">{String(srcRaw || '-')}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
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
                                <span>Tiếp tục: Ghép cột ({parsedData?.totalRows || 0} dòng)</span>
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
                                disabled={!mapping.ratingScoreColumn || isSubmitting || isUploading}
                                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-xs"
                            >
                                {(isSubmitting || isUploading) && <Loader2 className="h-4 w-4 animate-spin" />}
                                <span>
                                    {isUploading
                                        ? `Đang đẩy tệp lên Amazon S3 (${progress}%)...`
                                        : isSubmitting
                                          ? 'Đang lưu vào CSDL...'
                                          : `Xác nhận import (${parsedData?.totalRows} dòng)`}
                                </span>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
