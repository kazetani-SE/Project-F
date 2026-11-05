import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Star,
    AlertCircle,
    Loader2,
    Download,
    FileSpreadsheet,
    FileUp,
    Search,
    ChevronLeft,
    ChevronRight,
    MessageSquare,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import {
    getFeedbacksByEvent,
    getFeedbackSummaryByEvent,
} from '../../../services/knowledgeService';
import { getPresignedDownloadUrl } from '../../../services/storageService';
import { FeedbackImportModal } from './FeedbackImportModal';
import {
    type FeedbackResponse,
    type FeedbackSummaryResponse,
    FEEDBACK_SOURCE_LABELS,
} from '../../../types/models/knowledge';

interface Props {
    eventId: string;
}

const ITEMS_PER_PAGE = 8;

export const FeedbackSection: React.FC<Props> = ({ eventId }) => {
    const [feedbacks, setFeedbacks] = useState<FeedbackResponse[]>([]);
    const [summary, setSummary] = useState<FeedbackSummaryResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters & Search
    const [selectedSource, setSelectedSource] = useState<string>('ALL');
    const [selectedRating, setSelectedRating] = useState<string>('ALL');
    const [searchKeyword, setSearchKeyword] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(1);

    // Modal state
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Collapsible state for customResponses in feedback cards
    const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set());

    const toggleCardExpanded = (id: string) => {
        setExpandedCardIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

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

    // Filtered Feedbacks
    const filteredFeedbacks = useMemo(() => {
        return feedbacks.filter((fb) => {
            // Filter by Source
            if (selectedSource !== 'ALL' && fb.sourceType !== selectedSource) {
                return false;
            }

            // Filter by Rating
            if (selectedRating !== 'ALL' && fb.ratingScore !== Number(selectedRating)) {
                return false;
            }

            // Search Keyword in highlights, improvements, or custom responses
            if (searchKeyword.trim()) {
                const kw = searchKeyword.toLowerCase();
                const hlMatch = fb.highlightContent?.toLowerCase().includes(kw);
                const impMatch = fb.improvementContent?.toLowerCase().includes(kw);
                const fileMatch = fb.fileUrl.toLowerCase().includes(kw);
                const jsonMatch = fb.customResponses
                    ? Object.values(fb.customResponses).some((v) =>
                          String(v).toLowerCase().includes(kw),
                      )
                    : false;

                if (!hlMatch && !impMatch && !fileMatch && !jsonMatch) {
                    return false;
                }
            }

            return true;
        });
    }, [feedbacks, selectedSource, selectedRating, searchKeyword]);

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedSource, selectedRating, searchKeyword]);

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredFeedbacks.length / ITEMS_PER_PAGE));
    const paginatedFeedbacks = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredFeedbacks.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredFeedbacks, currentPage]);

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
                        Import bảng tính Excel / CSV xuất ra từ Google Forms, Microsoft Forms và lưu trữ an toàn trên Amazon S3.
                    </p>
                </div>

                <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
                >
                    <FileUp className="h-4 w-4" />
                    <span>Import File Excel Từ Form</span>
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
                    <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                    <span>{error}</span>
                </div>
            )}

            {/* Dashboard Thống kê tổng quan */}
            {summary && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
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
                                            ? 'fill-amber-400 text-amber-400'
                                            : 'text-slate-200'
                                    }`}
                                />
                            ))}
                        </div>
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                            Điểm đánh giá trung bình ({summary.totalFeedbacks} phản hồi)
                        </p>
                    </div>

                    {/* Breakdown bars */}
                    <div className="space-y-2.5 md:col-span-2">
                        {[5, 4, 3, 2, 1].map((star) => {
                            const count = summary.ratingBreakdown[star] || 0;
                            const percent =
                                summary.totalFeedbacks > 0
                                    ? Math.round((count / summary.totalFeedbacks) * 100)
                                    : 0;
                            return (
                                <div
                                    key={star}
                                    onClick={() => setSelectedRating(selectedRating === String(star) ? 'ALL' : String(star))}
                                    className="flex items-center gap-3 text-xs cursor-pointer group p-1 -m-1 rounded-lg hover:bg-slate-50 transition-colors"
                                    title={`Lọc theo ${star} sao`}
                                >
                                    <div className="flex items-center gap-1 w-14 font-semibold text-slate-600 group-hover:text-emerald-700">
                                        <span>{star} sao</span>
                                    </div>
                                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${
                                                selectedRating === String(star) ? 'bg-emerald-600' : 'bg-amber-400'
                                            }`}
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                    <span className="w-16 text-right text-slate-400 font-medium group-hover:text-slate-700">
                                        {count} ({percent}%)
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Filter Bar & Search */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between border-y border-slate-100 py-3">
                {/* Source and Star Filters */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Source Pills */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setSelectedSource('ALL')}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                                selectedSource === 'ALL'
                                    ? 'bg-white text-slate-900 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Tất cả ({feedbacks.length})
                        </button>
                        {Object.entries(FEEDBACK_SOURCE_LABELS).map(([k, v]) => (
                            <button
                                key={k}
                                onClick={() => setSelectedSource(k)}
                                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                                    selectedSource === k
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                {v} ({feedbacks.filter((f) => f.sourceType === k).length})
                            </button>
                        ))}
                    </div>

                    {/* Star Quick Filter Pill */}
                    {selectedRating !== 'ALL' && (
                        <div className="flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
                            <span>Lọc: {selectedRating} sao</span>
                            <button
                                onClick={() => setSelectedRating('ALL')}
                                className="ml-1 hover:text-rose-600"
                            >
                                ×
                            </button>
                        </div>
                    )}
                </div>

                {/* Search Box */}
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                        type="text"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        placeholder="Tìm kiếm nội dung..."
                        className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:border-emerald-500 focus:outline-hidden"
                    />
                </div>
            </div>

            {/* Feedback Cards List */}
            {isLoading ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    <p className="text-xs">Đang tải danh sách khảo sát…</p>
                </div>
            ) : filteredFeedbacks.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                    <FileSpreadsheet className="h-10 w-10 text-slate-400" />
                    <h3 className="mt-3 text-sm font-semibold text-slate-700">
                        {feedbacks.length === 0
                            ? 'Chưa có dữ liệu phản hồi khảo sát nào'
                            : 'Không tìm thấy phản hồi nào phù hợp với bộ lọc'}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400 max-w-sm">
                        {feedbacks.length === 0
                            ? 'Bấm nút "Import File Excel Từ Form" để tải lên bảng tính Google Forms hoặc Microsoft Forms.'
                            : 'Thử điều chỉnh lại bộ lọc đối tượng, số sao hoặc từ khóa tìm kiếm.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3.5">
                    {paginatedFeedbacks.map((fb) => {
                        const fileName = extractFileName(fb.fileUrl);
                        const isExpanded = expandedCardIds.has(fb.id);
                        const customKeys = fb.customResponses ? Object.keys(fb.customResponses) : [];

                        return (
                            <div
                                key={fb.id}
                                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-slate-300"
                            >
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                    <div className="flex items-start gap-3">
                                        <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700 border border-emerald-100 shrink-0">
                                            <MessageSquare className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                                                    {FEEDBACK_SOURCE_LABELS[fb.sourceType]}
                                                </span>
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
                                                    <span className="ml-1 text-xs font-bold text-slate-700">
                                                        {fb.ratingScore}/5 sao
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                                                <span>Import lúc: {new Date(fb.submittedAt).toLocaleString('vi-VN')}</span>
                                                <span>•</span>
                                                <span className="text-slate-500 font-medium">Nguồn: {fileName}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action download Excel file */}
                                    {fb.fileUrl && (
                                        <button
                                            type="button"
                                            onClick={() => handleOpenAttachment(fb.fileUrl)}
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-xs"
                                            title="Tải tệp Excel gốc từ S3"
                                        >
                                            <Download className="h-3.5 w-3.5 text-slate-500" />
                                            <span>Tệp Form gốc (S3)</span>
                                        </button>
                                    )}
                                </div>

                                {/* Highlight and Improvement Sections */}
                                {(fb.highlightContent || fb.improvementContent) && (
                                    <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                                        {fb.highlightContent && (
                                            <div className="rounded-xl bg-emerald-50/60 p-3 border border-emerald-100">
                                                <span className="font-bold text-emerald-800 block mb-1">
                                                    ✓ Điểm sáng nổi bật:
                                                </span>
                                                <p className="text-slate-700 leading-relaxed">{fb.highlightContent}</p>
                                            </div>
                                        )}
                                        {fb.improvementContent && (
                                            <div className="rounded-xl bg-amber-50/60 p-3 border border-amber-100">
                                                <span className="font-bold text-amber-800 block mb-1">
                                                    ! Đề xuất cải tiến:
                                                </span>
                                                <p className="text-slate-700 leading-relaxed">{fb.improvementContent}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Collapsible Custom Responses (JSONB) */}
                                {customKeys.length > 0 && (
                                    <div className="mt-3 border-t border-slate-100 pt-2.5">
                                        <button
                                            type="button"
                                            onClick={() => toggleCardExpanded(fb.id)}
                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-emerald-700 transition-colors"
                                        >
                                            <span>
                                                {isExpanded ? 'Thu gọn' : 'Xem thêm'} {customKeys.length} câu hỏi khảo sát phụ
                                            </span>
                                            {isExpanded ? (
                                                <ChevronUp className="h-3.5 w-3.5" />
                                            ) : (
                                                <ChevronDown className="h-3.5 w-3.5" />
                                            )}
                                        </button>

                                        {isExpanded && (
                                            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100 text-xs">
                                                {Object.entries(fb.customResponses).map(([key, val]) => (
                                                    <div key={key} className="space-y-0.5">
                                                        <span className="text-[11px] font-semibold text-slate-500 block">
                                                            {key}
                                                        </span>
                                                        <span className="text-xs text-slate-800 font-medium break-words">
                                                            {String(val || '-')}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
                    <span className="text-slate-500">
                        Hiển thị {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{' '}
                        {Math.min(currentPage * ITEMS_PER_PAGE, filteredFeedbacks.length)} trong số{' '}
                        {filteredFeedbacks.length} phản hồi
                    </span>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        {Array.from({ length: totalPages }).map((_, idx) => {
                            const pageNum = idx + 1;
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`min-w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                                        currentPage === pageNum
                                            ? 'bg-emerald-600 text-white'
                                            : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Feedback Import Modal */}
            <FeedbackImportModal
                eventId={eventId}
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={fetchData}
            />
        </div>
    );
};
