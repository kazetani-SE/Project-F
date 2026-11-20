import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Star,
    AlertCircle,
    FileSpreadsheet,
    CloudUpload,
    PenLine,
    Eye,
    Trash2,
    ExternalLink,
    ChevronDown,
    RotateCcw,
    FileText,
    BarChart3,
    MessageSquareText,
    ListFilter,
    CheckCircle2,
    Search,
} from 'lucide-react';
import {
    getFeedbacksByEvent,
    getFeedbackSummaryByEvent,
    deleteFeedback,
} from '../../../services/knowledgeService';
import { getPresignedDownloadUrl } from '../../../services/storageService';
import { FeedbackImportModal } from './FeedbackImportModal';
import { ManualFeedbackModal } from './ManualFeedbackModal';
import { ConfirmationDialog } from '../../../components/ui/ConfirmationDialog';
import { useSuccessToast } from '../../../components/ui/toastContext';
import { useActiveEvent } from '../../../context/activeEventContext';
import { useAuth, isClubAdmin } from '../../../context/authContext';
import {
    aggregateFeedbackQuestions,
    classifySuggestionQuestionType,
    extractStructuredFeedback,
    isTrivialSuggestionAnswer,
} from '../../../utils/excelParser';
import {
    type FeedbackResponse,
    type FeedbackSummaryResponse,
    type FeedbackSourceType,
    FEEDBACK_SOURCE_LABELS,
} from '../../../types/models/knowledge';

interface Props {
    eventId: string;
    onCountChange?: (count: number) => void;
}

const INITIAL_VISIBLE_CARDS = 6;
const LOAD_MORE_STEP = 8;

const SOURCE_ORDER: FeedbackSourceType[] = ['ATTENDEE', 'ORGANIZER', 'SPONSOR', 'SPEAKER'];

interface SurveySourceGroup {
    fileUrl: string;
    formTitle: string;
    platform: string;
    formUrl: string;
    sourceType: FeedbackSourceType;
    responseCount: number;
    skippedRows: number;
    fileName: string;
    importedBy: string;
    importedAt: string;
    feedbackIds: string[];
}

type DetailTabMode = 'CARDS' | 'QUESTIONS';

export const FeedbackSection: React.FC<Props> = ({ eventId, onCountChange }) => {
    const { currentEvent, role } = useActiveEvent();
    const { user } = useAuth();
    const showToast = useSuccessToast();

    // RBAC check: LEAD_HEADER or Club Admin (PRESIDENT/VICEPRESIDENT) can manage (import/manual add/delete)
    // Fallback to true if role is not restricted so testing in dev works seamlessly while respecting denied/member roles
    const canManageFeedback =
        isClubAdmin(user?.clubRole) || role === 'LEAD_HEADER' || role === null;

    const [feedbacks, setFeedbacks] = useState<FeedbackResponse[]>([]);
    const [summary, setSummary] = useState<FeedbackSummaryResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters matching Figma
    const [selectedSource, setSelectedSource] = useState<string>('ALL');
    const [selectedSourceFile, setSelectedSourceFile] = useState<string>('ALL');
    const [selectedRating, setSelectedRating] = useState<number | null>(null);
    const [searchKeyword, setSearchKeyword] = useState<string>('');
    const [visibleCount, setVisibleCount] = useState<number>(INITIAL_VISIBLE_CARDS);

    // Detail mode: CARDS (default Figma 2-column cards) | QUESTIONS (Question & suggestion breakdown)
    const [detailMode, setDetailMode] = useState<DetailTabMode>('CARDS');
    const [hideTrivialAnswers, setHideTrivialAnswers] = useState<boolean>(true);

    // Modals
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);

    // Delete confirmation state (either a single feedback or an entire import batch)
    const [deleteTarget, setDeleteTarget] = useState<{
        title: string;
        message: string;
        feedbackIds: string[];
    } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<unknown>(null);

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
            onCountChange?.(feedbacksData.length);
        } catch (err: unknown) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải dữ liệu khảo sát & feedback',
            );
        } finally {
            setIsLoading(false);
        }
    }, [eventId, onCountChange]);

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

    const inferPlatform = (fb: FeedbackResponse, fileName: string): string => {
        const cr = fb.customResponses || {};
        if (typeof cr._formPlatform === 'string' && cr._formPlatform.trim()) {
            return cr._formPlatform.trim();
        }
        if (typeof cr.formSource === 'string') {
            if (cr.formSource.toLowerCase().includes('microsoft')) return 'Microsoft Forms';
            if (cr.formSource.toLowerCase().includes('google')) return 'Google Forms';
        }
        const lowerFile = fileName.toLowerCase();
        if (lowerFile.includes('nhap_thu_cong')) return 'Nhập thủ công';
        if (lowerFile.includes('ms_forms') || lowerFile.includes('microsoft') || lowerFile.includes('nha_tai_tro')) {
            return 'Microsoft Forms';
        }
        return 'Google Forms';
    };

    const inferFormTitle = (fb: FeedbackResponse, sourceType: FeedbackSourceType): string => {
        const cr = fb.customResponses || {};
        if (typeof cr._formTitle === 'string' && cr._formTitle.trim()) {
            return cr._formTitle.trim();
        }
        const eventName = currentEvent?.name || 'Orientation Day K21';
        switch (sourceType) {
            case 'ATTENDEE':
                return `Khảo sát người tham dự · ${eventName}`;
            case 'ORGANIZER':
                return `Đánh giá nội bộ BTC · ${eventName}`;
            case 'SPONSOR':
                return `Phản hồi đối tác tài trợ · ${eventName}`;
            case 'SPEAKER':
                return `Phản hồi diễn giả & mentor · ${eventName}`;
        }
    };

    // Group feedbacks into "Nguồn dữ liệu khảo sát" (Survey Data Sources table)
    const surveySources = useMemo<SurveySourceGroup[]>(() => {
        const map = new Map<string, SurveySourceGroup>();

        for (const fb of feedbacks) {
            const key = fb.fileUrl || `manual-${fb.sourceType}`;
            const fileName = extractFileName(fb.fileUrl || 'khao_sat.xlsx');
            const cr = fb.customResponses || {};
            const existing = map.get(key);

            if (existing) {
                existing.responseCount += 1;
                existing.feedbackIds.push(fb.id);
                if (
                    typeof cr._skippedRows === 'number' &&
                    cr._skippedRows > existing.skippedRows
                ) {
                    existing.skippedRows = cr._skippedRows;
                }
            } else {
                const platform = inferPlatform(fb, fileName);
                const defaultFormUrl =
                    platform === 'Microsoft Forms'
                        ? 'https://forms.office.com'
                        : 'https://docs.google.com/forms';

                map.set(key, {
                    fileUrl: fb.fileUrl,
                    formTitle: inferFormTitle(fb, fb.sourceType),
                    platform,
                    formUrl:
                        typeof cr._formUrl === 'string' && cr._formUrl.trim()
                            ? cr._formUrl.trim()
                            : defaultFormUrl,
                    sourceType: fb.sourceType,
                    responseCount: 1,
                    skippedRows: typeof cr._skippedRows === 'number' ? cr._skippedRows : 0,
                    fileName,
                    importedBy:
                        typeof cr._importedBy === 'string' && cr._importedBy.trim()
                            ? cr._importedBy.trim()
                            : 'Lê Hoàng',
                    importedAt: fb.submittedAt,
                    feedbackIds: [fb.id],
                });
            }
        }

        return Array.from(map.values());
    }, [feedbacks, currentEvent?.name]);

    // Calculate live summary metrics from feedbacks
    const dashboardMetrics = useMemo(() => {
        const total = feedbacks.length;
        const breakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        let sum = 0;

        for (const fb of feedbacks) {
            const star = Math.min(5, Math.max(1, Math.round(fb.ratingScore)));
            breakdown[star] = (breakdown[star] || 0) + 1;
            sum += fb.ratingScore;
        }

        const averageRating =
            total > 0
                ? Number((sum / total).toFixed(1))
                : summary
                  ? Number(summary.averageRating.toFixed(1))
                  : 0;

        // Per-audience stats (THEO ĐỐI TƯỢNG)
        const byAudience = SOURCE_ORDER.map((src) => {
            const items = feedbacks.filter((f) => f.sourceType === src);
            const count = items.length;
            const avg =
                count > 0
                    ? Number(
                          (
                              items.reduce((acc, item) => acc + item.ratingScore, 0) / count
                          ).toFixed(1),
                      )
                    : 0;
            return {
                sourceType: src,
                label: FEEDBACK_SOURCE_LABELS[src],
                count,
                avg,
            };
        });

        // Custom criteria averages (TIÊU CHÍ RIÊNG)
        const aggregated = aggregateFeedbackQuestions(feedbacks);

        return {
            total,
            importBatchCount: surveySources.length,
            averageRating,
            breakdown,
            byAudience,
            ratingQuestions: aggregated.ratingQuestions,
            suggestionQuestions: aggregated.suggestionQuestions,
        };
    }, [feedbacks, summary, surveySources.length]);

    // Filtered feedbacks for "Phản hồi chi tiết"
    const filteredFeedbacks = useMemo(() => {
        const kw = searchKeyword.trim().toLowerCase();

        return feedbacks.filter((fb) => {
            if (selectedSource !== 'ALL' && fb.sourceType !== selectedSource) {
                return false;
            }
            if (selectedSourceFile !== 'ALL' && fb.fileUrl !== selectedSourceFile) {
                return false;
            }
            if (selectedRating !== null && Math.round(fb.ratingScore) !== selectedRating) {
                return false;
            }
            if (kw) {
                const ext = extractStructuredFeedback(fb);
                const hlMatch = fb.highlightContent?.toLowerCase().includes(kw);
                const impMatch = fb.improvementContent?.toLowerCase().includes(kw);
                const metaMatch = Object.entries(ext.metadata).some(
                    ([k, v]) => k.toLowerCase().includes(kw) || v.toLowerCase().includes(kw),
                );
                const ratingMatch = ext.ratings.some((r) =>
                    r.question.toLowerCase().includes(kw),
                );
                const suggestionMatch = ext.suggestions.some(
                    (s) =>
                        s.question.toLowerCase().includes(kw) ||
                        s.answer.toLowerCase().includes(kw),
                );
                return (
                    Boolean(hlMatch) ||
                    Boolean(impMatch) ||
                    Boolean(metaMatch) ||
                    Boolean(ratingMatch) ||
                    Boolean(suggestionMatch)
                );
            }
            return true;
        });
    }, [feedbacks, selectedSource, selectedSourceFile, selectedRating, searchKeyword]);

    // Aggregated questions for filtered feedbacks (when viewing Question breakdown mode)
    const filteredQuestionStats = useMemo(
        () => aggregateFeedbackQuestions(filteredFeedbacks),
        [filteredFeedbacks],
    );

    // Reset visible cards count when filters change
    useEffect(() => {
        setVisibleCount(INITIAL_VISIBLE_CARDS);
    }, [selectedSource, selectedSourceFile, selectedRating, searchKeyword]);

    const visibleFeedbacks = useMemo(
        () => filteredFeedbacks.slice(0, visibleCount),
        [filteredFeedbacks, visibleCount],
    );
    const remainingCount = Math.max(0, filteredFeedbacks.length - visibleCount);

    // Execute deletion (single feedback or batch of feedbacks from a source)
    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        setDeleteError(null);
        try {
            for (const id of deleteTarget.feedbackIds) {
                await deleteFeedback(id, eventId);
            }
            showToast(
                deleteTarget.feedbackIds.length > 1
                    ? `Đã xóa đợt khảo sát (${deleteTarget.feedbackIds.length} phản hồi)!`
                    : 'Đã xóa phản hồi khảo sát!',
            );
            setDeleteTarget(null);
            if (
                selectedSourceFile !== 'ALL' &&
                surveySources.find((s) => s.fileUrl === selectedSourceFile)?.feedbackIds.length ===
                    deleteTarget.feedbackIds.length
            ) {
                setSelectedSourceFile('ALL');
            }
            await fetchData();
        } catch (err: unknown) {
            setDeleteError(err);
        } finally {
            setIsDeleting(false);
        }
    };

    const renderStars = (score: number, sizeClass = 'h-3.5 w-3.5') => {
        const rounded = Math.round(score);
        return (
            <div className="inline-flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`${sizeClass} ${
                            star <= rounded
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-200'
                        }`}
                    />
                ))}
            </div>
        );
    };

    const renderPlatformBadge = (platform: string) => {
        const isMs = platform.toLowerCase().includes('microsoft');
        const isManual = platform.toLowerCase().includes('thủ công');

        if (isMs) {
            return (
                <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 border border-sky-200/60">
                    <FileText className="h-3 w-3 text-sky-600" />
                    <span>Microsoft Forms</span>
                </span>
            );
        }
        if (isManual) {
            return (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200/60">
                    <PenLine className="h-3 w-3 text-amber-600" />
                    <span>Nhập thủ công</span>
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 border border-violet-200/60">
                <FileText className="h-3 w-3 text-violet-600" />
                <span>Google Forms</span>
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Top Description & Action Buttons matching Figma */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                    Kết quả khảo sát được thu bằng Google Forms / Microsoft Forms rồi import file
                    export (CSV, XLSX) vào hệ thống. Nhập thủ công chỉ dùng cho phản hồi lẻ, ví dụ
                    qua email.
                </p>

                {canManageFeedback && (
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => setIsManualModalOpen(true)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
                        >
                            <PenLine className="h-3.5 w-3.5 text-slate-600" />
                            <span>Nhập thủ công</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsImportModalOpen(true)}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-800 transition-colors"
                        >
                            <CloudUpload className="h-4 w-4" />
                            <span>Import kết quả khảo sát</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Error Notice with Retry Button */}
            {error && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
                    <div className="flex items-center gap-2.5">
                        <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                        <span>{error}</span>
                    </div>
                    <button
                        type="button"
                        onClick={fetchData}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors shrink-0"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Thử lại</span>
                    </button>
                </div>
            )}

            {/* Loading Skeleton State (UX Standard Section 5) */}
            {isLoading ? (
                <div className="space-y-6 animate-pulse">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                        <div className="lg:col-span-4 h-44 rounded-2xl border border-slate-200 bg-white p-6" />
                        <div className="lg:col-span-4 h-44 rounded-2xl border border-slate-200 bg-white p-6" />
                        <div className="lg:col-span-4 h-44 rounded-2xl border border-slate-200 bg-white p-6" />
                    </div>
                    <div className="h-56 rounded-2xl border border-slate-200 bg-white p-6" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="h-36 rounded-2xl border border-slate-200 bg-white p-5" />
                        <div className="h-36 rounded-2xl border border-slate-200 bg-white p-5" />
                    </div>
                </div>
            ) : feedbacks.length === 0 ? (
                /* Empty State */
                <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                    <FileSpreadsheet className="h-10 w-10 text-slate-400" />
                    <h3 className="mt-3 text-sm font-semibold text-slate-700">
                        Chưa có dữ liệu phản hồi khảo sát nào
                    </h3>
                    <p className="mt-1 text-xs text-slate-400 max-w-sm">
                        Bấm nút &ldquo;Import kết quả khảo sát&rdquo; để tải lên bảng tính Google
                        Forms / Microsoft Forms hoặc &ldquo;Nhập thủ công&rdquo; cho phản hồi lẻ.
                    </p>
                </div>
            ) : (
                <>
                    {/* =================================================================
                        1. KHỐI 3 CARD THỐNG KÊ TỔNG QUAN (ĐIỂM TB | PHÂN BỐ ĐIỂM | THEO ĐỐI TƯỢNG)
                       ================================================================= */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                        {/* Card 1: ĐIỂM TRUNG BÌNH */}
                        <div className="lg:col-span-4 flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs text-center">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                Điểm trung bình
                            </span>

                            <div className="mt-2 inline-flex items-baseline gap-1">
                                <span className="text-4xl font-extrabold text-slate-900">
                                    {dashboardMetrics.averageRating.toFixed(1)}
                                </span>
                                <span className="text-lg font-semibold text-slate-400">/5</span>
                            </div>

                            <div className="mt-2.5">
                                {renderStars(dashboardMetrics.averageRating, 'h-4 w-4')}
                            </div>

                            <p className="mt-2 text-xs text-slate-500">
                                {dashboardMetrics.total} phản hồi ·{' '}
                                {dashboardMetrics.importBatchCount} đợt import
                            </p>
                        </div>

                        {/* Card 2: PHÂN BỐ ĐIỂM (Click vào từng dòng sao để lọc nhanh) */}
                        <div className="lg:col-span-4 flex flex-col justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    Phân bố điểm
                                </span>
                                {selectedRating !== null && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRating(null)}
                                        className="text-[11px] font-semibold text-emerald-700 hover:underline"
                                    >
                                        Bỏ lọc ({selectedRating}★)
                                    </button>
                                )}
                            </div>

                            <div className="space-y-2">
                                {[5, 4, 3, 2, 1].map((star) => {
                                    const count = dashboardMetrics.breakdown[star] || 0;
                                    const pct =
                                        dashboardMetrics.total > 0
                                            ? Math.round((count / dashboardMetrics.total) * 100)
                                            : 0;
                                    const isActive = selectedRating === star;

                                    return (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() =>
                                                setSelectedRating((prev) =>
                                                    prev === star ? null : star,
                                                )
                                            }
                                            title={`Lọc các phản hồi ${star} sao`}
                                            className={`w-full flex items-center gap-2.5 rounded-lg px-1.5 py-0.5 text-xs transition-colors ${
                                                isActive
                                                    ? 'bg-emerald-50 ring-1 ring-emerald-200'
                                                    : 'hover:bg-slate-50'
                                            }`}
                                        >
                                            <span className="inline-flex items-center gap-1 w-8 font-semibold text-slate-700 shrink-0">
                                                <span>{star}</span>
                                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                            </span>

                                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className="h-full rounded-full bg-emerald-700 transition-all duration-500"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>

                                            <span className="w-6 text-right font-medium text-slate-600 tabular-nums">
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Card 3: THEO ĐỐI TƯỢNG & TIÊU CHÍ RIÊNG */}
                        <div className="lg:col-span-4 flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2.5">
                                    Theo đối tượng
                                </span>

                                <div className="space-y-2">
                                    {dashboardMetrics.byAudience.map((aud) => (
                                        <div
                                            key={aud.sourceType}
                                            className="flex items-center justify-between text-xs"
                                        >
                                            <span className="text-slate-700 font-medium">
                                                {aud.label}{' '}
                                                <span className="text-slate-400">
                                                    ({aud.count})
                                                </span>
                                            </span>

                                            <div className="flex items-center gap-2">
                                                {renderStars(aud.avg, 'h-3 w-3')}
                                                <span className="w-6 text-right font-bold text-slate-900 tabular-nums">
                                                    {aud.count > 0 ? aud.avg.toFixed(1) : '—'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {dashboardMetrics.ratingQuestions.length > 0 && (
                                <div className="border-t border-slate-100 pt-3">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                                        Tiêu chí riêng
                                    </span>
                                    <div className="space-y-1.5 max-h-24 overflow-y-auto">
                                        {dashboardMetrics.ratingQuestions.slice(0, 3).map((rq) => (
                                            <div
                                                key={rq.question}
                                                className="flex items-center justify-between gap-2 text-xs"
                                            >
                                                <span
                                                    className="text-slate-600 truncate"
                                                    title={rq.question}
                                                >
                                                    {rq.question}
                                                </span>
                                                <span className="font-bold text-slate-900 shrink-0 tabular-nums">
                                                    {rq.averageScore.toFixed(1)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* =================================================================
                        2. BẢNG NGUỒN DỮ LIỆU KHẢO SÁT (SURVEY DATA SOURCES TABLE)
                       ================================================================= */}
                    <div className="space-y-3">
                        <h3 className="text-base font-bold text-slate-900">
                            Nguồn dữ liệu khảo sát
                        </h3>

                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        <tr>
                                            <th className="py-3 px-4">Form khảo sát</th>
                                            <th className="py-3 px-4">Đối tượng</th>
                                            <th className="py-3 px-4 text-right">Phản hồi</th>
                                            <th className="py-3 px-4">File gốc</th>
                                            <th className="py-3 px-4">Import</th>
                                            <th className="py-3 px-4 text-right" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {surveySources.map((src) => {
                                            const isFilteringThisSource =
                                                selectedSourceFile === src.fileUrl;

                                            return (
                                                <tr
                                                    key={src.fileUrl}
                                                    className={`transition-colors ${
                                                        isFilteringThisSource
                                                            ? 'bg-emerald-50/40'
                                                            : 'hover:bg-slate-50/70'
                                                    }`}
                                                >
                                                    {/* FORM KHẢO SÁT */}
                                                    <td className="py-3.5 px-4">
                                                        <div className="space-y-1.5">
                                                            <p className="font-bold text-slate-900 text-xs">
                                                                {src.formTitle}
                                                            </p>
                                                            <div className="flex items-center gap-2.5 flex-wrap">
                                                                {renderPlatformBadge(src.platform)}
                                                                {src.formUrl && (
                                                                    <a
                                                                        href={src.formUrl}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                                                                    >
                                                                        <ExternalLink className="h-3 w-3" />
                                                                        <span>Mở form</span>
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* ĐỐI TƯỢNG */}
                                                    <td className="py-3.5 px-4">
                                                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                                                            {FEEDBACK_SOURCE_LABELS[src.sourceType]}
                                                        </span>
                                                    </td>

                                                    {/* PHẢN HỒI */}
                                                    <td className="py-3.5 px-4 text-right">
                                                        <span className="font-extrabold text-slate-900 text-sm block tabular-nums">
                                                            {src.responseCount}
                                                        </span>
                                                        {src.skippedRows > 0 && (
                                                            <span className="text-[11px] text-slate-400 block">
                                                                bỏ qua {src.skippedRows} dòng
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* FILE GỐC */}
                                                    <td className="py-3.5 px-4">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleOpenAttachment(src.fileUrl)
                                                            }
                                                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline max-w-[220px]"
                                                            title={`Tải tệp ${src.fileName}`}
                                                        >
                                                            <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                                            <span className="truncate">
                                                                {src.fileName}
                                                            </span>
                                                        </button>
                                                    </td>

                                                    {/* IMPORT */}
                                                    <td className="py-3.5 px-4">
                                                        <p className="font-medium text-slate-700">
                                                            {src.importedBy}
                                                        </p>
                                                        <p className="text-[11px] text-slate-400">
                                                            {new Date(
                                                                src.importedAt,
                                                            ).toLocaleDateString('vi-VN')}
                                                        </p>
                                                    </td>

                                                    {/* ACTIONS: VIEW & DELETE */}
                                                    <td className="py-3.5 px-4 text-right">
                                                        <div className="inline-flex items-center justify-end gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setSelectedSourceFile((prev) =>
                                                                        prev === src.fileUrl
                                                                            ? 'ALL'
                                                                            : src.fileUrl,
                                                                    )
                                                                }
                                                                className={`rounded-lg border p-1.5 transition-colors ${
                                                                    isFilteringThisSource
                                                                        ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                                                                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                                                }`}
                                                                title={
                                                                    isFilteringThisSource
                                                                        ? 'Đang lọc theo nguồn này (Bấm để xem tất cả)'
                                                                        : 'Lọc xem phản hồi từ nguồn này'
                                                                }
                                                            >
                                                                <Eye className="h-3.5 w-3.5" />
                                                            </button>

                                                            {canManageFeedback && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setDeleteTarget({
                                                                            title: 'Xóa nguồn dữ liệu khảo sát',
                                                                            message: `Bạn có chắc chắn muốn xóa đợt khảo sát "${src.formTitle}" (${src.responseCount} phản hồi)? Hành động này không thể hoàn tác.`,
                                                                            feedbackIds:
                                                                                src.feedbackIds,
                                                                        })
                                                                    }
                                                                    className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                                                    title="Xóa đợt import khảo sát này"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* =================================================================
                        3. KHU VỰC PHẢN HỒI CHI TIẾT & BỘ LỌC (MATCHING FIGMA)
                       ================================================================= */}
                    <div className="space-y-4 pt-2">
                        {/* Header & Filter Bar */}
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h3 className="text-base font-bold text-slate-900">
                                    Phản hồi chi tiết{' '}
                                    <span className="font-normal text-slate-400">
                                        ({filteredFeedbacks.length})
                                    </span>
                                </h3>

                                {/* Sub-view switcher: Cards (Figma default) vs Question Breakdown */}
                                { (dashboardMetrics.ratingQuestions.length > 0 ||
                                    dashboardMetrics.suggestionQuestions.length > 0) && (
                                    <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px]">
                                        <button
                                            type="button"
                                            onClick={() => setDetailMode('CARDS')}
                                            className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                                                detailMode === 'CARDS'
                                                    ? 'bg-white text-emerald-700 shadow-2xs'
                                                    : 'text-slate-500 hover:text-slate-800'
                                            }`}
                                        >
                                            Thẻ phản hồi
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDetailMode('QUESTIONS')}
                                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold transition-colors ${
                                                detailMode === 'QUESTIONS'
                                                    ? 'bg-white text-emerald-700 shadow-2xs'
                                                    : 'text-slate-500 hover:text-slate-800'
                                            }`}
                                        >
                                            <BarChart3 className="h-3 w-3" />
                                            <span>Thống kê câu hỏi</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Right Filters: Segmented Audience Pills + Source File Dropdown + Search */}
                            <div className="flex flex-wrap items-center gap-2.5">
                                {/* Segmented Audience Filter Pills matching Figma */}
                                <div className="inline-flex flex-wrap items-center rounded-xl border border-slate-200 bg-white p-1">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedSource('ALL')}
                                        className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                                            selectedSource === 'ALL'
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        Tất cả
                                    </button>
                                    {SOURCE_ORDER.map((srcKey) => (
                                        <button
                                            key={srcKey}
                                            type="button"
                                            onClick={() => setSelectedSource(srcKey)}
                                            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                                                selectedSource === srcKey
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            {FEEDBACK_SOURCE_LABELS[srcKey]}
                                        </button>
                                    ))}
                                </div>

                                {/* Data Source Dropdown ("Mọi nguồn dữ liệu") */}
                                <select
                                    aria-label="Lọc theo nguồn dữ liệu khảo sát"
                                    value={selectedSourceFile}
                                    onChange={(e) => setSelectedSourceFile(e.target.value)}
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-emerald-500 focus:outline-hidden max-w-[210px] truncate"
                                >
                                    <option value="ALL">Mọi nguồn dữ liệu</option>
                                    {surveySources.map((src) => (
                                        <option key={src.fileUrl} value={src.fileUrl}>
                                            {src.formTitle} ({src.responseCount})
                                        </option>
                                    ))}
                                </select>

                                {/* Search input */}
                                <div className="relative w-full sm:w-48">
                                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchKeyword}
                                        onChange={(e) => setSearchKeyword(e.target.value)}
                                        placeholder="Tìm nội dung..."
                                        className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:border-emerald-500 focus:outline-hidden"
                                    />
                                </div>
                            </div>
                        </div>

                        {filteredFeedbacks.length === 0 ? (
                            <div className="flex h-48 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
                                <p className="text-sm font-semibold text-slate-700">
                                    Không tìm thấy phản hồi nào khớp với bộ lọc hiện tại
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedSource('ALL');
                                        setSelectedSourceFile('ALL');
                                        setSelectedRating(null);
                                        setSearchKeyword('');
                                    }}
                                    className="mt-2 text-xs font-semibold text-emerald-700 hover:underline"
                                >
                                    Đặt lại toàn bộ bộ lọc
                                </button>
                            </div>
                        ) : detailMode === 'CARDS' ? (
                            /* =========================================================
                               CHẾ ĐỘ MẶC ĐỊNH FIGMA: LƯỚI 2 CỘT CARD PHẢN HỒI CHI TIẾT
                               ========================================================= */
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {visibleFeedbacks.map((fb) => {
                                        const fileName = extractFileName(fb.fileUrl);
                                        const platform = inferPlatform(fb, fileName);
                                        const extracted = extractStructuredFeedback(fb);

                                        // Determine structured sections for the card:
                                        // 1. If the record has structured question suggestions (from Excel import), classify each question accurately
                                        //    so self-reflection questions ("Bạn cần cải thiện gì?") are never mislabeled as "CẦN KHẮC PHỤC" (BTC issue).
                                        // 2. Otherwise fall back to fb.highlightContent and fb.improvementContent (from manual entry / summary records).
                                        const meaningfulSuggestions = extracted.suggestions.filter(
                                            (s) => !isTrivialSuggestionAnswer(s.answer),
                                        );

                                        const highlightItems: string[] = [];
                                        const improvementItems: string[] = [];
                                        const customOpenItems: { question: string; answer: string }[] = [];

                                        if (meaningfulSuggestions.length > 0) {
                                            for (const s of meaningfulSuggestions) {
                                                const qType = classifySuggestionQuestionType(
                                                    s.question,
                                                );
                                                if (qType === 'HIGHLIGHT') {
                                                    highlightItems.push(s.answer);
                                                } else if (qType === 'IMPROVEMENT') {
                                                    improvementItems.push(s.answer);
                                                } else {
                                                    customOpenItems.push(s);
                                                }
                                            }
                                        } else {
                                            if (
                                                fb.highlightContent &&
                                                !isTrivialSuggestionAnswer(fb.highlightContent)
                                            ) {
                                                highlightItems.push(fb.highlightContent);
                                            }
                                            if (
                                                fb.improvementContent &&
                                                !isTrivialSuggestionAnswer(fb.improvementContent)
                                            ) {
                                                improvementItems.push(fb.improvementContent);
                                            }
                                        }

                                        const highlightText =
                                            highlightItems.length > 0
                                                ? highlightItems.join(' • ')
                                                : null;
                                        const improvementText =
                                            improvementItems.length > 0
                                                ? improvementItems.join(' • ')
                                                : null;

                                        // Build footer criteria pills (Rating questions + Metadata)
                                        const footerPills: { label: string; value: string }[] = [];
                                        for (const r of extracted.ratings) {
                                            footerPills.push({
                                                label: r.question,
                                                value: String(r.score),
                                            });
                                        }
                                        for (const [k, v] of Object.entries(extracted.metadata)) {
                                            if (
                                                !/(email|id|mssv|timestamp|dấu thời gian)/i.test(k)
                                            ) {
                                                footerPills.push({
                                                    label: k.replace(/[?:]+$/, ''),
                                                    value: v,
                                                });
                                            }
                                        }

                                        return (
                                            <div
                                                key={fb.id}
                                                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition-all hover:border-slate-300 space-y-3.5"
                                            >
                                                <div className="space-y-3">
                                                    {/* Card Top Row: Audience Pill + Platform Badge + Date + Stars */}
                                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                                                                {
                                                                    FEEDBACK_SOURCE_LABELS[
                                                                        fb.sourceType
                                                                    ]
                                                                }
                                                            </span>
                                                            {renderPlatformBadge(platform)}
                                                            <span className="text-xs text-slate-400">
                                                                {new Date(
                                                                    fb.submittedAt,
                                                                ).toLocaleDateString('vi-VN')}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {renderStars(
                                                                fb.ratingScore,
                                                                'h-3.5 w-3.5',
                                                            )}
                                                            {canManageFeedback && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setDeleteTarget({
                                                                            title: 'Xóa phản hồi khảo sát',
                                                                            message:
                                                                                'Bạn có chắc chắn muốn xóa phiếu phản hồi này không?',
                                                                            feedbackIds: [fb.id],
                                                                        })
                                                                    }
                                                                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
                                                                    title="Xóa phản hồi này"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* ĐIỂM LÀM TỐT */}
                                                    {highlightText && (
                                                        <div className="space-y-0.5">
                                                            <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                                                                Điểm làm tốt
                                                            </span>
                                                            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                                                                {highlightText}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* CẦN KHẮC PHỤC (Góp ý cho BTC / Sự kiện) */}
                                                    {improvementText && (
                                                        <div className="space-y-0.5">
                                                            <span className="block text-[11px] font-bold uppercase tracking-wider text-amber-700">
                                                                Cần khắc phục
                                                            </span>
                                                            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                                                                {improvementText}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* CÁC CÂU HỎI TỰ LUẬN KHÁC (Giữ đúng nhãn câu hỏi gốc trong Form, VD: "Bạn cần cải thiện gì?") */}
                                                    {customOpenItems.length > 0 && (
                                                        <div className="space-y-2">
                                                            {customOpenItems.map((s) => (
                                                                <div
                                                                    key={s.question}
                                                                    className="space-y-0.5"
                                                                >
                                                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                                                        {s.question}
                                                                    </span>
                                                                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                                                                        {s.answer}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Bottom Custom Criteria Pills */}
                                                {footerPills.length > 0 && (
                                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                        {footerPills.slice(0, 4).map((pill) => (
                                                            <span
                                                                key={`${pill.label}-${pill.value}`}
                                                                className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600"
                                                            >
                                                                <span>{pill.label}:</span>
                                                                <strong className="font-bold text-slate-900">
                                                                    {pill.value}
                                                                </strong>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Load More Button matching Figma ("⌄ Xem thêm N phản hồi") */}
                                {remainingCount > 0 && (
                                    <div className="flex justify-center pt-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setVisibleCount((prev) => prev + LOAD_MORE_STEP)
                                            }
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
                                        >
                                            <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                                            <span>
                                                Xem thêm {remainingCount} phản hồi
                                            </span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* =========================================================
                               CHẾ ĐỘ THỐNG KÊ THEO CÂU HỎI & GÓP Ý TỰ LUẬN
                               ========================================================= */
                            <div className="space-y-6">
                                {filteredQuestionStats.ratingQuestions.length > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {filteredQuestionStats.ratingQuestions.map((rq, index) => {
                                            const pct = Math.min(
                                                100,
                                                Math.round((rq.averageScore / rq.scaleMax) * 100),
                                            );
                                            return (
                                                <div
                                                    key={rq.question}
                                                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col justify-between gap-3"
                                                >
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                                                            <span className="font-bold text-slate-600">
                                                                Tiêu chí #{index + 1}
                                                            </span>
                                                            <span>{rq.responseCount} lượt chấm</span>
                                                        </div>
                                                        <h5 className="text-xs font-bold text-slate-800">
                                                            {rq.question}
                                                        </h5>
                                                    </div>

                                                    <div className="space-y-2 border-t border-slate-100 pt-3">
                                                        <div className="flex items-baseline justify-between">
                                                            <span className="text-xl font-extrabold text-emerald-700">
                                                                {rq.averageScore.toFixed(2)}{' '}
                                                                <span className="text-xs font-semibold text-slate-400">
                                                                    / {rq.scaleMax}
                                                                </span>
                                                            </span>
                                                            <span className="text-xs font-semibold text-emerald-700">
                                                                {pct}%
                                                            </span>
                                                        </div>
                                                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                                            <div
                                                                className="h-full rounded-full bg-emerald-700"
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {filteredQuestionStats.suggestionQuestions.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                                                <MessageSquareText className="h-4 w-4 text-emerald-600" />
                                                <span>
                                                    Tổng hợp ý kiến theo câu hỏi tự luận (
                                                    {filteredQuestionStats.suggestionQuestions.length})
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setHideTrivialAnswers((prev) => !prev)
                                                }
                                                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-semibold transition-colors ${
                                                    hideTrivialAnswers
                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                                        : 'border-slate-200 bg-white text-slate-600'
                                                }`}
                                            >
                                                <ListFilter className="h-3.5 w-3.5" />
                                                <span>
                                                    {hideTrivialAnswers
                                                        ? 'Đang ẩn câu trả lời "Không / No"'
                                                        : 'Ẩn câu trả lời "Không / No"'}
                                                </span>
                                            </button>
                                        </div>

                                        {filteredQuestionStats.suggestionQuestions.map((sq) => {
                                            const visibleAnswers = hideTrivialAnswers
                                                ? sq.answers.filter((a) => !a.isTrivial)
                                                : sq.answers;
                                            return (
                                                <div
                                                    key={sq.question}
                                                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3"
                                                >
                                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                                        <h5 className="text-xs font-bold text-slate-900">
                                                            {sq.question}
                                                        </h5>
                                                        <span className="text-[11px] text-slate-400">
                                                            {sq.meaningfulCount} góp ý chi tiết /{' '}
                                                            {sq.totalAnswers} phản hồi
                                                        </span>
                                                    </div>

                                                    {visibleAnswers.length === 0 ? (
                                                        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                            <span>
                                                                Không có góp ý phát sinh thêm cho
                                                                câu hỏi này.
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                                            {visibleAnswers.map((ans, idx) => (
                                                                <div
                                                                    key={`${ans.feedbackId}-${idx}`}
                                                                    className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3 text-xs space-y-1"
                                                                >
                                                                    <p className="text-slate-800 font-medium">
                                                                        &ldquo;{ans.answer}&rdquo;
                                                                    </p>
                                                                    <span className="text-[11px] text-slate-400 block">
                                                                        {ans.respondentLabel}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Modal: Import Excel / CSV */}
            <FeedbackImportModal
                eventId={eventId}
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={fetchData}
            />

            {/* Modal: Nhập thủ công */}
            <ManualFeedbackModal
                eventId={eventId}
                isOpen={isManualModalOpen}
                onClose={() => setIsManualModalOpen(false)}
                onSuccess={fetchData}
            />

            {/* Confirmation Dialog for Deleting Feedback / Batch */}
            {deleteTarget && (
                <ConfirmationDialog
                    title={deleteTarget.title}
                    message={deleteTarget.message}
                    busy={isDeleting}
                    error={deleteError}
                    onCancel={() => {
                        if (!isDeleting) {
                            setDeleteTarget(null);
                            setDeleteError(null);
                        }
                    }}
                    onConfirm={handleConfirmDelete}
                />
            )}
        </div>
    );
};
