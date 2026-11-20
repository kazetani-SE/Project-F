import React, { useState, useEffect, useCallback } from 'react';
import {
    Sparkles,
    RefreshCw,
    AlertTriangle,
    CheckCircle2,
    Copy,
    Check,
    TrendingUp,
    AlertCircle,
    Building2,
    PlusCircle,
    ChevronDown,
    ChevronUp,
    Clock,
    Loader2,
} from 'lucide-react';
import {
    getSavedFeedbackAiReport,
    generateFeedbackAiReport,
    createIncident,
} from '../../../services/knowledgeService';
import {
    type FeedbackAiReportResponse,
    type FeedbackAiSuggestedIncident,
    type Department,
    DEPARTMENT_LABELS,
} from '../../../types/models/knowledge';
import { useAuth } from '../../../context/authContext';

interface Props {
    eventId: string;
    totalFeedbacksCount: number;
}

export const FeedbackAiReportPanel: React.FC<Props> = ({ eventId, totalFeedbacksCount }) => {
    const { user } = useAuth();
    const [report, setReport] = useState<FeedbackAiReportResponse | null>(null);
    const [isLoadingSaved, setIsLoadingSaved] = useState<boolean>(true);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState<boolean>(true);
    const [copiedMarkdown, setCopiedMarkdown] = useState<boolean>(false);
    const [savedIncidentIdx, setSavedIncidentIdx] = useState<Set<number>>(new Set());
    const [savingIncidentIdx, setSavingIncidentIdx] = useState<number | null>(null);

    const fetchSavedReport = useCallback(async () => {
        setIsLoadingSaved(true);
        setError(null);
        try {
            const saved = await getSavedFeedbackAiReport(eventId);
            setReport(saved);
        } catch {
            // Chưa có báo cáo hoặc lỗi kết nối nhẹ thì giữ trạng thái chưa tạo
        } finally {
            setIsLoadingSaved(false);
        }
    }, [eventId]);

    useEffect(() => {
        fetchSavedReport();
    }, [fetchSavedReport, totalFeedbacksCount]);

    const handleGenerateReport = async () => {
        setIsGenerating(true);
        setError(null);
        try {
            const generated = await generateFeedbackAiReport(eventId);
            setReport(generated);
            setIsExpanded(true);
        } catch (err: unknown) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tổng hợp báo cáo AI lúc này. Vui lòng thử lại.',
            );
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyMarkdown = async () => {
        if (!report) return;
        const lines = [
            `# Báo Cáo Tổng Hợp Khảo Sát Sự Kiện (AI Executive Summary)`,
            `- **Model sử dụng**: ${report.modelUsed} (${report.modelTier} Tier)`,
            `- **Số phiếu phân tích**: ${report.feedbackCountSnapshot} phiếu (Điểm TB: ${report.averageRatingSnapshot.toFixed(2)}/5.0★)`,
            `- **Thời gian tổng hợp**: ${new Date(report.updatedAt || report.generatedAt).toLocaleString('vi-VN')}`,
            ``,
            `## 1. Tóm Tắt Toàn Cảnh`,
            report.executiveSummary,
            ``,
            `## 2. Điểm Sáng Nổi Bật`,
            ...report.topHighlights.map((h) => `- ${h}`),
            ``,
            `## 3. Vấn Đề Cần Cải Thiện`,
            ...report.topImprovements.map((i) => `- ${i}`),
            ``,
            `## 4. Khuyến Nghị Hành Động Theo Từng Ban`,
            ...report.departmentActions.map(
                (da) =>
                    `- **${DEPARTMENT_LABELS[da.department as Department] || da.department}**: ${da.action}`,
            ),
        ];
        await navigator.clipboard.writeText(lines.join('\n'));
        setCopiedMarkdown(true);
        setTimeout(() => setCopiedMarkdown(false), 2000);
    };

    const handlePromoteToIncident = async (item: FeedbackAiSuggestedIncident, idx: number) => {
        setSavingIncidentIdx(idx);
        try {
            await createIncident(eventId, {
                reportedBy: user?.id || null,
                title: item.title,
                severity: item.severity || 'MEDIUM',
                departments: item.departments?.length ? item.departments : ['PLAN'],
                description: item.description,
                rootCause: item.rootCause,
                immediateSolution: item.immediateSolution,
                lessonLearned: item.lessonLearned,
            });
            setSavedIncidentIdx((prev) => new Set(prev).add(idx));
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Lỗi khi chuyển thành sự cố Post-Mortem');
        } finally {
            setSavingIncidentIdx(null);
        }
    };

    if (isLoadingSaved) {
        return (
            <div className="flex items-center justify-between rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/50 px-5 py-4 shadow-2xs">
                <div className="flex items-center gap-3 text-xs text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                    <span>Đang kiểm tra bản báo cáo AI đã lưu trong cơ sở dữ liệu…</span>
                </div>
            </div>
        );
    }

    // Chưa từng có báo cáo AI trong DB
    if (!report) {
        return (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-xs">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-semibold">
                                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                                Phân tích phản hồi AI
                            </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 pt-0.5">
                            Tổng hợp báo cáo từ {totalFeedbacksCount} phiếu khảo sát
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                            Tự động trích xuất điểm sáng, tồn tại cần cải thiện và gợi ý hành động cụ thể cho từng ban chuyên môn từ ý kiến người tham gia.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleGenerateReport}
                        disabled={isGenerating || totalFeedbacksCount === 0}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-all"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Đang phân tích...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4" />
                                <span>Tạo báo cáo phân tích</span>
                            </>
                        )}
                    </button>
                </div>

                {error && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
            </div>
        );
    }

    const posPct = report.sentimentBreakdown?.positive ?? 0;
    const neuPct = report.sentimentBreakdown?.neutral ?? 0;
    const negPct = report.sentimentBreakdown?.negative ?? 0;

    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            {/* Top Bar */}
            <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 text-emerald-800 px-2.5 py-1 text-xs font-semibold">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                        Báo cáo phân tích AI
                    </span>

                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        Cập nhật:{' '}
                        {new Date(report.updatedAt || report.generatedAt).toLocaleString('vi-VN')}
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={handleCopyMarkdown}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        {copiedMarkdown ? (
                            <>
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="text-emerald-700">Đã chép</span>
                            </>
                        ) : (
                            <>
                                <Copy className="h-3.5 w-3.5 text-slate-500" />
                                <span>Copy báo cáo</span>
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={handleGenerateReport}
                        disabled={isGenerating}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                        <span>{isGenerating ? 'Đang phân tích…' : 'Phân tích lại'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsExpanded((prev) => !prev)}
                        className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50"
                        title={isExpanded ? 'Thu gọn báo cáo' : 'Mở rộng báo cáo'}
                    >
                        {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                        ) : (
                            <ChevronDown className="h-4 w-4" />
                        )}
                    </button>
                </div>
            </div>

            {/* Banner cảnh báo dữ liệu mới */}
            {report.isStale && (
                <div className="flex flex-col gap-2 border-b border-amber-200 bg-amber-50 px-5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-xs text-amber-900">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                        <span>
                            Có thêm <strong>{report.newFeedbackCountDelta > 0 ? report.newFeedbackCountDelta : 'mới'}</strong> phản hồi khảo sát kể từ lần phân tích trước.
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={handleGenerateReport}
                        disabled={isGenerating}
                        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw className={`h-3 w-3 ${isGenerating ? 'animate-spin' : ''}`} />
                        <span>Cập nhật báo cáo</span>
                    </button>
                </div>
            )}

            {error && (
                <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {isExpanded && (
                <div className="p-5 space-y-5">
                    {/* 1. Executive Summary & Sentiment Bar */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                        <div className="lg:col-span-8 rounded-xl bg-slate-50 p-4 border border-slate-100">
                            <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                                Tóm tắt tổng quan
                            </h5>
                            <p className="text-sm text-slate-800 leading-relaxed">
                                {report.executiveSummary}
                            </p>
                        </div>

                        <div className="lg:col-span-4 rounded-xl bg-slate-50 p-4 border border-slate-100 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
                                    <span>Tỷ lệ sắc thái phản hồi</span>
                                    <span className="text-emerald-700 font-bold">
                                        {report.feedbackCountSnapshot} phiếu
                                    </span>
                                </div>

                                <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden flex">
                                    <div
                                        className="bg-emerald-500 h-full"
                                        style={{ width: `${posPct}%` }}
                                        title={`Tích cực: ${posPct}%`}
                                    />
                                    <div
                                        className="bg-amber-400 h-full"
                                        style={{ width: `${neuPct}%` }}
                                        title={`Trung lập: ${neuPct}%`}
                                    />
                                    <div
                                        className="bg-rose-500 h-full"
                                        style={{ width: `${negPct}%` }}
                                        title={`Cần cải thiện: ${negPct}%`}
                                    />
                                </div>
                            </div>

                            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
                                <div className="rounded-lg bg-emerald-50 p-1.5 border border-emerald-200 text-emerald-800">
                                    <span className="block font-bold text-sm">{posPct}%</span>
                                    <span>Tích cực</span>
                                </div>
                                <div className="rounded-lg bg-amber-50 p-1.5 border border-amber-200 text-amber-800">
                                    <span className="block font-bold text-sm">{neuPct}%</span>
                                    <span>Trung lập</span>
                                </div>
                                <div className="rounded-lg bg-rose-50 p-1.5 border border-rose-200 text-rose-800">
                                    <span className="block font-bold text-sm">{negPct}%</span>
                                    <span>Khắc phục</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Điểm sáng & Vấn đề cần khắc phục */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 mb-2.5">
                                <TrendingUp className="h-4 w-4 text-emerald-600" />
                                <span>Điểm đánh giá tích cực</span>
                            </div>
                            <ul className="space-y-2 text-xs text-slate-700">
                                {report.topHighlights.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 mt-0.5" />
                                        <span className="leading-relaxed">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 mb-2.5">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <span>Vấn đề cần ưu tiên khắc phục</span>
                            </div>
                            <ul className="space-y-2 text-xs text-slate-700">
                                {report.topImprovements.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                                        <span className="leading-relaxed">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* 3. Khuyến nghị hành động theo từng Ban */}
                    {report.departmentActions && report.departmentActions.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 mb-2.5">
                                <Building2 className="h-4 w-4 text-emerald-600" />
                                <span>Khuyến nghị hành động theo từng ban</span>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {report.departmentActions.map((da, idx) => (
                                    <div
                                        key={idx}
                                        className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs space-y-1.5"
                                    >
                                        <span className="inline-block rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                                            {DEPARTMENT_LABELS[da.department as Department] ||
                                                da.department}
                                        </span>
                                        <p className="text-slate-600 leading-relaxed">{da.action}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 4. Gợi ý chuyển thành Sự cố Post-Mortem */}
                    {report.suggestedIncidents && report.suggestedIncidents.length > 0 && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                            <div className="space-y-0.5">
                                <span className="text-xs font-bold text-slate-800">
                                    Gợi ý chuyển thành sự cố Post-Mortem
                                </span>
                                <p className="text-[11px] text-slate-500">
                                    Lưu các vấn đề được phản hồi nhiều thành bản ghi Sự cố để rút kinh nghiệm cho các mùa tiếp theo.
                                </p>
                            </div>

                            <div className="mt-3 space-y-2.5">
                                {report.suggestedIncidents.map((inc, idx) => {
                                    const isSaved = savedIncidentIdx.has(idx);
                                    const isSaving = savingIncidentIdx === idx;
                                    return (
                                        <div
                                            key={idx}
                                            className="flex flex-col gap-3 rounded-xl bg-white p-3.5 border border-slate-200 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div className="space-y-1 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                                        {inc.severity}
                                                    </span>
                                                    <span className="font-semibold text-slate-900">
                                                        {inc.title}
                                                    </span>
                                                </div>
                                                <p className="text-slate-600">
                                                    <strong className="text-slate-700">
                                                        Bài học đề xuất:
                                                    </strong>{' '}
                                                    {inc.lessonLearned}
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                disabled={isSaved || isSaving}
                                                onClick={() => handlePromoteToIncident(inc, idx)}
                                                className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                                                    isSaved
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                }`}
                                            >
                                                {isSaving ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : isSaved ? (
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                ) : (
                                                    <PlusCircle className="h-3.5 w-3.5" />
                                                )}
                                                <span>
                                                    {isSaved
                                                        ? 'Đã lưu sự cố'
                                                        : 'Lưu sự cố'}
                                                </span>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
