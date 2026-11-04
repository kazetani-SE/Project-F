import React, { useState, useEffect, useCallback } from 'react';
import {
    Star,
    MessageSquare,
    Plus,
    FileText,
    AlertCircle,
    Loader2,
    CheckCircle,
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

    // Modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [formSourceType, setFormSourceType] = useState<FeedbackSourceType>('ATTENDEE');
    const [formRating, setFormRating] = useState(5);
    const [formHighlights, setFormHighlights] = useState('');
    const [formImprovements, setFormImprovements] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [customQuestionKey, setCustomQuestionKey] = useState('recommendToFriend');
    const [customQuestionVal, setCustomQuestionVal] = useState('Có, rất đáng tham gia');
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
            setError(err instanceof Error ? err.message : 'Không thể tải khảo sát & phản hồi');
        } finally {
            setIsLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSubmitFeedback = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) {
            setUploadError('Vui lòng đính kèm tệp minh chứng hoặc ảnh khảo sát');
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
                            [customQuestionKey]: customQuestionVal,
                        },
                    };
                    return await submitFeedback(eventId, req);
                },
            });

            setIsCreateModalOpen(false);
            setFormHighlights('');
            setFormImprovements('');
            setSelectedFile(null);
            setUploadError(null);
            await fetchData();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Lỗi khi gửi phản hồi';
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

    return (
        <div className="space-y-6">
            {/* Thanh công cụ & Nút gửi phản hồi */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-base font-bold text-slate-900">
                        Khảo Sát & Phản Hồi Đa Chiều
                    </h3>
                    <p className="text-xs text-slate-500">
                        Thu thập ý kiến đóng góp từ người tham dự, ban tổ chức và nhà tài trợ.
                    </p>
                </div>

                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    <span>Gửi phản hồi / Khảo sát</span>
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
                            Đánh giá trung bình ({summary.totalFeedbacks} lượt phản hồi)
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
                                    <span className="w-10 text-right text-slate-400">{count} lượt</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Danh sách các phản hồi chi tiết */}
            {isLoading ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    <p className="text-sm">Đang tải danh sách phản hồi…</p>
                </div>
            ) : feedbacks.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                    <MessageSquare className="h-10 w-10 text-slate-400" />
                    <h3 className="mt-3 text-sm font-semibold text-slate-700">Chưa có khảo sát nào</h3>
                    <p className="mt-1 text-xs text-slate-400">
                        Gửi liên kết khảo sát cho người tham dự sau khi sự kiện kết thúc.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {feedbacks.map((fb) => (
                        <div
                            key={fb.id}
                            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-slate-300"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                                            {FEEDBACK_SOURCE_LABELS[fb.sourceType]}
                                        </span>
                                        <div className="flex items-center text-amber-400">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Star
                                                    key={s}
                                                    className={`h-3.5 w-3.5 ${
                                                        s <= fb.ratingScore ? 'fill-amber-400' : 'text-slate-200'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400">
                                        Gửi lúc: {new Date(fb.submittedAt).toLocaleString('vi-VN')}
                                    </p>
                                </div>

                                {fb.fileUrl && (
                                    <button
                                        type="button"
                                        onClick={() => handleOpenAttachment(fb.fileUrl)}
                                        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
                                    >
                                        <FileText className="h-3.5 w-3.5" />
                                        <span>Minh chứng đính kèm</span>
                                    </button>
                                )}
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                                {fb.highlightContent && (
                                    <div className="rounded-xl bg-emerald-50/50 p-3 border border-emerald-100">
                                        <span className="font-bold text-emerald-800 block mb-1">
                                            ✓ Điểm làm tốt:
                                        </span>
                                        <p className="text-slate-700">{fb.highlightContent}</p>
                                    </div>
                                )}
                                {fb.improvementContent && (
                                    <div className="rounded-xl bg-amber-50/50 p-3 border border-amber-100">
                                        <span className="font-bold text-amber-800 block mb-1">
                                            ! Điểm cần cải thiện:
                                        </span>
                                        <p className="text-slate-700">{fb.improvementContent}</p>
                                    </div>
                                )}
                            </div>

                            {/* Dữ liệu khảo sát động JSONB */}
                            {fb.customResponses && Object.keys(fb.customResponses).length > 0 && (
                                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase">
                                        Câu hỏi mở rộng (JSONB):
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
                    ))}
                </div>
            )}

            {/* Modal Gửi Khảo Sát Mới */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-base font-bold text-slate-900">Gửi phản hồi / Khảo sát</h3>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmitFeedback} className="mt-4 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Đối tượng gửi *</label>
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

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Điểm đánh giá *</label>
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
                                <label className="block text-xs font-semibold text-slate-700">Điểm làm tốt (Highlights)</label>
                                <textarea
                                    rows={2}
                                    value={formHighlights}
                                    onChange={(e) => setFormHighlights(e.target.value)}
                                    placeholder="Những trải nghiệm hài lòng nhất..."
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-emerald-500 focus:outline-hidden"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700">Điểm cần cải thiện</label>
                                <textarea
                                    rows={2}
                                    value={formImprovements}
                                    onChange={(e) => setFormImprovements(e.target.value)}
                                    placeholder="Góp ý để các mùa sau hoàn thiện hơn..."
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-emerald-500 focus:outline-hidden"
                                />
                            </div>

                            {/* Trường câu hỏi khảo sát động JSONB */}
                            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                                <label className="block text-xs font-bold text-slate-700 mb-2">
                                    Tiêu chí khảo sát mở rộng (Lưu trữ PostgreSQL JSONB)
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="text"
                                        value={customQuestionKey}
                                        onChange={(e) => setCustomQuestionKey(e.target.value)}
                                        placeholder="Tên tiêu chí (key)"
                                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono"
                                    />
                                    <input
                                        type="text"
                                        value={customQuestionVal}
                                        onChange={(e) => setCustomQuestionVal(e.target.value)}
                                        placeholder="Giá trị trả lời"
                                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Tệp đính kèm (Ảnh phiếu khảo sát / Minh chứng) *
                                </label>
                                <FileUploader
                                    category="FEEDBACK"
                                    selectedFile={selectedFile}
                                    onFileSelect={setSelectedFile}
                                    isUploading={isUploading}
                                    progress={progress}
                                    error={uploadError}
                                    description="Hỗ trợ ảnh chụp JPG, PNG hoặc PDF minh chứng"
                                />
                            </div>

                            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
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
                                    {(isSubmitting || isUploading) ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <CheckCircle className="h-4 w-4" />
                                    )}
                                    <span>
                                        {isUploading
                                            ? `Đang đẩy lên S3 (${progress}%)...`
                                            : isSubmitting
                                              ? 'Đang lưu CSDL...'
                                              : 'Gửi phản hồi'}
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
