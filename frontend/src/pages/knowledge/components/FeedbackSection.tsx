import React, { useState, useEffect, useCallback } from 'react';
import {
    Star,
    AlertCircle,
    Loader2,
    XCircle,
    Download,
    FileSpreadsheet,
    FileUp,
} from 'lucide-react';
import {
    getFeedbacksByEvent,
    getFeedbackSummaryByEvent,
    submitFeedback,
} from '../../../services/knowledgeService';
import { getPresignedDownloadUrl } from '../../../services/storageService';
import { FileUploader } from '../../../components/common/FileUploader';
import { executeStagedUploadAndSave } from '../../../services/uploadWorkflow';
import { useS3Upload } from '../../../hooks/useS3Upload';
import {
    type FeedbackResponse,
    type FeedbackSummaryResponse,
    type FeedbackSourceType,
    type CreateFeedbackRequest,
    FEEDBACK_SOURCE_LABELS,
} from '../../../types/models/knowledge';

interface Props {
    eventId: string;
}

export const FeedbackSection: React.FC<Props> = ({ eventId }) => {
    const [feedbacks, setFeedbacks] = useState<FeedbackResponse[]>([]);
    const [summary, setSummary] = useState<FeedbackSummaryResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [selectedSource, setSelectedSource] = useState<string>('ALL');

    // Modal state for Excel Import
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [formPlatform, setFormPlatform] = useState<'Google Forms' | 'Microsoft Forms' | 'Khác'>('Google Forms');
    const [formSourceType, setFormSourceType] = useState<FeedbackSourceType>('ATTENDEE');
    const [formTotalResponses, setFormTotalResponses] = useState('100');
    const [formRating, setFormRating] = useState(5);
    const [formHighlights, setFormHighlights] = useState('');
    const [formImprovements, setFormImprovements] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // Dynamic JSONB Responses
    const [customQuestionKey, setCustomQuestionKey] = useState('favoriteSession');
    const [customQuestionVal, setCustomQuestionVal] = useState('Workshop CI/CD with GitHub Actions');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const { isUploading, progress, uploadFile } = useS3Upload();

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [feedbacksData, summaryData] = await Promise.all([
                getFeedbacksByEvent(eventId),
                getFeedbackSummaryByEvent(eventId),
            ]);
            setFeedbacks(feedbacksData);
            setSummary(summaryData);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu khảo sát & feedback');
        } finally {
            setIsLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleImportExcelFeedback = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) {
            setUploadError('Vui lòng chọn tệp Excel hoặc CSV xuất từ Form khảo sát');
            return;
        }

        setIsSubmitting(true);
        setUploadError(null);
        try {
            await executeStagedUploadAndSave({
                file: selectedFile,
                category: 'FEEDBACK',
                uploadToS3: (file, cat) => uploadFile(file, cat),
                saveToDatabase: async (fileUrl) => {
                    const req: CreateFeedbackRequest = {
                        sourceType: formSourceType,
                        ratingScore: formRating,
                        fileUrl,
                        highlightContent: formHighlights.trim() || null,
                        improvementContent: formImprovements.trim() || null,
                        customResponses: {
                            formPlatform,
                            totalResponses: Number(formTotalResponses) || formTotalResponses,
                            fileName: selectedFile.name,
                            [customQuestionKey]: customQuestionVal,
                        },
                    };
                    return await submitFeedback(eventId, req);
                },
            });

            setIsImportModalOpen(false);
            setFormHighlights('');
            setFormImprovements('');
            setSelectedFile(null);
            setUploadError(null);
            await fetchData();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Lỗi khi import file Excel khảo sát';
            setUploadError(msg);
            alert(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenAttachment = async (fileUrl: string) => {
        try {
            const res = await getPresignedDownloadUrl(fileUrl);
            window.open(res.downloadUrl, '_blank');
        } catch {
            window.open(fileUrl, '_blank');
        }
    };

    const extractFileName = (fileUrl: string) => {
        const parts = fileUrl.split('/');
        const lastPart = parts[parts.length - 1] || 'khao_sat_form.xlsx';
        return decodeURIComponent(lastPart.split('?')[0]);
    };

    const filteredFeedbacks = feedbacks.filter((fb) => {
        return selectedSource === 'ALL' || fb.sourceType === selectedSource;
    });

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                        <h3 className="text-base font-bold text-slate-900">
                            Khảo Sát & Phản Hồi Từ Form
                        </h3>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                        Import dữ liệu khảo sát từ tệp Excel / CSV xuất ra từ Google Forms, Microsoft Forms và lưu trữ an toàn trên Amazon S3.
                    </p>
                </div>

                <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
                >
                    <FileUp className="h-4 w-4" />
                    <span>Import File Excel Từ Form</span>
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                    <span>{error}</span>
                </div>
            )}

            {/* Dashboard Thống kê tổng quan */}
            {summary && (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                    <div className="flex flex-col items-center justify-center border-b border-slate-100 pb-4 md:border-b-0 md:border-r md:pr-6 md:pb-0">
                        <span className="text-4xl font-extrabold text-slate-900">
                            {summary.averageRating.toFixed(1)}
                        </span>
                        <div className="mt-2 flex items-center gap-1 text-amber-400">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={`h-5 w-5 ${
                                        star <= Math.round(summary.averageRating)
                                            ? 'fill-amber-400'
                                            : 'text-slate-200'
                                    }`}
                                />
                            ))}
                        </div>
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                            Điểm đánh giá trung bình ({summary.totalFeedbacks} đợt khảo sát Form)
                        </p>
                    </div>

                    {/* Breakdown bars */}
                    <div className="space-y-2 md:col-span-2">
                        {[5, 4, 3, 2, 1].map((star) => {
                            const count = summary.ratingBreakdown[star] || 0;
                            const percent =
                                summary.totalFeedbacks > 0
                                    ? Math.round((count / summary.totalFeedbacks) * 100)
                                    : 0;
                            return (
                                <div key={star} className="flex items-center gap-3 text-xs">
                                    <span className="w-12 font-semibold text-slate-600">{star} sao</span>
                                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full bg-amber-400 transition-all duration-500"
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                    <span className="w-12 text-right text-slate-400 font-medium">{count} ({percent}%)</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Source Filter Pills */}
            <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[11px]">
                    Nguồn Form:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                    <button
                        onClick={() => setSelectedSource('ALL')}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                            selectedSource === 'ALL'
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Tất cả ({feedbacks.length})
                    </button>
                    {Object.entries(FEEDBACK_SOURCE_LABELS).map(([k, v]) => (
                        <button
                            key={k}
                            onClick={() => setSelectedSource(k)}
                            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                                selectedSource === k
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {v} ({feedbacks.filter((f) => f.sourceType === k).length})
                        </button>
                    ))}
                </div>
            </div>

            {/* Danh sách các file Form khảo sát đã import */}
            {isLoading ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    <p className="text-sm">Đang tải danh sách khảo sát…</p>
                </div>
            ) : filteredFeedbacks.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                    <FileSpreadsheet className="h-10 w-10 text-slate-400" />
                    <h3 className="mt-3 text-sm font-semibold text-slate-700">Chưa có tệp khảo sát nào</h3>
                    <p className="mt-1 text-xs text-slate-400">
                        Bấm nút &quot;Import File Excel Từ Form&quot; để tải lên bảng tính Google Forms hoặc Microsoft Forms xuất ra.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredFeedbacks.map((fb) => {
                        const fileName = extractFileName(fb.fileUrl);
                        return (
                            <div
                                key={fb.id}
                                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-slate-300"
                            >
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                    <div className="flex items-start gap-3">
                                        <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-800 shrink-0">
                                            <FileSpreadsheet className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="font-bold text-slate-900 text-sm">{fileName}</h4>
                                                <span className="rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                                                    {FEEDBACK_SOURCE_LABELS[fb.sourceType]}
                                                </span>
                                            </div>
                                            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                                                <span>Import lúc: {new Date(fb.submittedAt).toLocaleString('vi-VN')}</span>
                                                <span>•</span>
                                                <div className="flex items-center text-amber-400">
                                                    {[1, 2, 3, 4, 5].map((s) => (
                                                        <Star
                                                            key={s}
                                                            className={`h-3.5 w-3.5 ${
                                                                s <= fb.ratingScore
                                                                    ? 'fill-amber-400 text-amber-400'
                                                                    : 'text-slate-200'
                                                            }`}
                                                        />
                                                    ))}
                                                    <span className="ml-1 font-semibold text-slate-700">
                                                        ({fb.ratingScore}/5 sao)
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action download Excel file */}
                                    {fb.fileUrl && (
                                        <button
                                            type="button"
                                            onClick={() => handleOpenAttachment(fb.fileUrl)}
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-xs"
                                            title="Tải tệp Excel gốc từ S3"
                                        >
                                            <Download className="h-3.5 w-3.5 text-emerald-700" />
                                            <span>Tải tệp Excel gốc (S3)</span>
                                        </button>
                                    )}
                                </div>

                                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                                    {fb.highlightContent && (
                                        <div className="rounded-xl bg-emerald-50/50 p-3 border border-emerald-100">
                                            <span className="font-bold text-emerald-800 block mb-1">
                                                ✓ Điểm sáng nổi bật từ Form:
                                            </span>
                                            <p className="text-slate-700 leading-relaxed">{fb.highlightContent}</p>
                                        </div>
                                    )}
                                    {fb.improvementContent && (
                                        <div className="rounded-xl bg-amber-50/50 p-3 border border-amber-100">
                                            <span className="font-bold text-amber-800 block mb-1">
                                                ! Đề xuất cải tiến từ Form:
                                            </span>
                                            <p className="text-slate-700 leading-relaxed">{fb.improvementContent}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Dữ liệu khảo sát động JSONB */}
                                {fb.customResponses && Object.keys(fb.customResponses).length > 0 && (
                                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                            Thông số khảo sát (JSONB):
                                        </span>
                                        {Object.entries(fb.customResponses).map(([key, val]) => (
                                            <span
                                                key={key}
                                                className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] text-slate-700 font-mono"
                                            >
                                                <span className="text-slate-400 font-sans">{key}: </span>
                                                {String(val)}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal Import File Excel từ Form */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">
                                        Import Tệp Khảo Sát Từ Form
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Hỗ trợ tệp xuất ra từ Google Forms, Microsoft Forms (.xlsx, .xls, .csv)
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsImportModalOpen(false)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                            >
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleImportExcelFeedback} className="mt-4 space-y-4">
                            {/* Khu vực tải file Excel */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Tệp Excel / CSV xuất từ Form (Lưu trữ Amazon S3) *
                                </label>
                                <FileUploader
                                    category="FEEDBACK"
                                    selectedFile={selectedFile}
                                    onFileSelect={setSelectedFile}
                                    isUploading={isUploading}
                                    progress={progress}
                                    error={uploadError}
                                    description="Hỗ trợ Excel (.xlsx, .xls) hoặc CSV (.csv) xuất từ Google Forms / MS Forms (Tối đa 50MB)"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Nền tảng Form *</label>
                                    <select
                                        value={formPlatform}
                                        onChange={(e) => setFormPlatform(e.target.value as 'Google Forms' | 'Microsoft Forms' | 'Khác')}
                                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
                                    >
                                        <option value="Google Forms">Google Forms</option>
                                        <option value="Microsoft Forms">Microsoft Forms</option>
                                        <option value="Khác">Khác / Khảo sát giấy</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Đối tượng khảo sát *</label>
                                    <select
                                        value={formSourceType}
                                        onChange={(e) => setFormSourceType(e.target.value as FeedbackSourceType)}
                                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
                                    >
                                        {Object.entries(FEEDBACK_SOURCE_LABELS).map(([k, v]) => (
                                            <option key={k} value={k}>
                                                {v}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Số phản hồi (Responses)</label>
                                    <input
                                        type="number"
                                        value={formTotalResponses}
                                        onChange={(e) => setFormTotalResponses(e.target.value)}
                                        placeholder="Ví dụ: 128"
                                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Điểm TB từ Form *</label>
                                    <div className="mt-2 flex items-center gap-1.5">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => setFormRating(s)}
                                                className="p-1 hover:scale-110 transition-transform"
                                            >
                                                <Star
                                                    className={`h-5 w-5 ${
                                                        s <= formRating
                                                            ? 'fill-amber-400 text-amber-400'
                                                            : 'text-slate-300'
                                                    }`}
                                                />
                                            </button>
                                        ))}
                                        <span className="ml-2 text-xs font-bold text-slate-700">{formRating}/5 sao</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700">
                                    Tổng hợp điểm sáng nổi bật (Highlights từ Form)
                                </label>
                                <textarea
                                    rows={2}
                                    value={formHighlights}
                                    onChange={(e) => setFormHighlights(e.target.value)}
                                    placeholder="Tóm tắt những câu trả lời tích cực tiêu biểu nhất từ người điền form..."
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-emerald-500 focus:outline-hidden"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700">
                                    Tổng hợp đề xuất cải tiến (Improvements từ Form)
                                </label>
                                <textarea
                                    rows={2}
                                    value={formImprovements}
                                    onChange={(e) => setFormImprovements(e.target.value)}
                                    placeholder="Tóm tắt các vấn đề hoặc kiến nghị cần khắc phục cho các mùa sau..."
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-emerald-500 focus:outline-hidden"
                                />
                            </div>

                            {/* Dynamic JSONB field */}
                            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                                <span className="block text-xs font-bold text-slate-700 mb-2">
                                    Chỉ số khảo sát bổ sung (Dynamic JSONB Fields)
                                </span>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <label className="text-slate-500">Tên trường (Key)</label>
                                        <input
                                            type="text"
                                            value={customQuestionKey}
                                            onChange={(e) => setCustomQuestionKey(e.target.value)}
                                            placeholder="favoriteSession, recommendRate..."
                                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 font-mono text-xs focus:border-emerald-500 focus:outline-hidden"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-slate-500">Giá trị thống kê (Value)</label>
                                        <input
                                            type="text"
                                            value={customQuestionVal}
                                            onChange={(e) => setCustomQuestionVal(e.target.value)}
                                            placeholder="96%, Workshop Git..."
                                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:border-emerald-500 focus:outline-hidden"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsImportModalOpen(false)}
                                    disabled={isSubmitting || isUploading}
                                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    disabled={!selectedFile || isSubmitting || isUploading}
                                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {(isSubmitting || isUploading) && <Loader2 className="h-4 w-4 animate-spin" />}
                                    <span>
                                        {isUploading
                                            ? `Đang đẩy lên S3 (${progress}%)...`
                                            : isSubmitting
                                              ? 'Đang lưu CSDL...'
                                              : 'Import & Lưu Form'}
                                    </span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
