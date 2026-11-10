import React, { useState, useEffect, useCallback } from 'react';
import {
    Sparkles,
    RefreshCw,
    AlertTriangle,
    CheckCircle2,
    Copy,
    Check,
    Cpu,
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
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/80 via-white to-teal-50/60 p-5 shadow-xs">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-2xs">
                                <Sparkles className="h-3.5 w-3.5" />
                                AI Feedback Agent
                            </span>
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                AWS Bedrock • Dynamic Model Routing
                            </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 pt-1">
                            Tổng hợp Báo cáo Khái quát từ {totalFeedbacksCount} phiếu Feedback
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                            AI Agent sẽ đọc toàn bộ điểm số và ý kiến tự luận để tóm tắt bức tranh toàn cảnh, chỉ ra điểm sáng, điểm nghẽn và đề xuất hành động cho từng Ban. Kết quả được lưu Snapshot vào DB để các thành viên xem ngay mà không tốn phí gọi lại AI.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleGenerateReport}
                        disabled={isGenerating || totalFeedbacksCount === 0}
                        className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-all"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>AI đang phân tích {totalFeedbacksCount} phiếu…</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4" />
                                <span>✨ Tạo Báo Cáo Tổng Hợp AI</span>
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
        <div className="rounded-2xl border border-emerald-200 bg-white shadow-xs overflow-hidden">
            {/* Top Bar */}
            <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-emerald-50/70 via-white to-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white">
                            <Sparkles className="h-3.5 w-3.5" />
                            Báo Cáo Tổng Hợp AI
                        </span>

                        <span
                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[11px] font-bold border ${
                                report.modelTier === 'DEEP'
                                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                                    : 'bg-sky-50 text-sky-800 border-sky-200'
                            }`}
                            title={report.routingReason}
                        >
                            <Cpu className="h-3 w-3" />
                            {report.modelTier === 'DEEP'
                                ? '🧠 Deep Tier (Sonnet/Opus)'
                                : '⚡ Fast Tier (Haiku/Nova)'}
                        </span>

                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <Clock className="h-3 w-3" />
                            Lưu lúc:{' '}
                            {new Date(report.updatedAt || report.generatedAt).toLocaleString(
                                'vi-VN',
                            )}
                        </span>
                    </div>

                    <p className="text-[11px] text-slate-500">{report.routingReason}</p>
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
                                <span className="text-emerald-700">Đã chép Markdown</span>
                            </>
                        ) : (
                            <>
                                <Copy className="h-3.5 w-3.5 text-slate-500" />
                                <span>Copy Báo cáo</span>
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={handleGenerateReport}
                        disabled={isGenerating}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                        <span>{isGenerating ? 'Đang tổng hợp lại…' : 'Tổng hợp lại'}</span>
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

            {/* Banner cảnh báo dữ liệu mới (Staleness Detection) */}
            {report.isStale && (
                <div className="flex flex-col gap-2 border-b border-amber-200 bg-amber-50/90 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-2.5 text-xs text-amber-900">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                        <div>
                            <span className="font-bold">
                                Phát hiện dữ liệu khảo sát mới cập nhật:
                            </span>{' '}
                            Báo cáo hiện tại được tạo trên mốc{' '}
                            <span className="font-bold">{report.feedbackCountSnapshot} phiếu</span>,
                            nhưng hệ thống hiện có{' '}
                            <span className="font-bold">{report.currentFeedbackCount} phiếu</span>
                            {report.newFeedbackCountDelta > 0 &&
                                ` (+${report.newFeedbackCountDelta} phiếu mới)`}
                            . Hệ thống đang hiển thị bản lưu trong DB để tiết kiệm chi phí AI.
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleGenerateReport}
                        disabled={isGenerating}
                        className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                        <span>Cập nhật báo cáo theo dữ liệu mới</span>
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
                            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                1. Tóm tắt toàn cảnh (Executive Summary)
                            </h5>
                            <p className="text-sm text-slate-800 leading-relaxed">
                                {report.executiveSummary}
                            </p>
                        </div>

                        <div className="lg:col-span-4 rounded-xl bg-slate-50 p-4 border border-slate-100 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                                    <span>Phân bổ sắc thái phản hồi</span>
                                    <span className="text-emerald-700">
                                        {report.feedbackCountSnapshot} phiếu
                                    </span>
                                </div>

                                <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden flex">
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
                                    <span className="block font-extrabold text-sm">{posPct}%</span>
                                    <span>Tích cực</span>
                                </div>
                                <div className="rounded-lg bg-amber-50 p-1.5 border border-amber-200 text-amber-800">
                                    <span className="block font-extrabold text-sm">{neuPct}%</span>
                                    <span>Trung lập</span>
                                </div>
                                <div className="rounded-lg bg-rose-50 p-1.5 border border-rose-200 text-rose-800">
                                    <span className="block font-extrabold text-sm">{negPct}%</span>
                                    <span>Cần khắc phục</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Điểm sáng & Vấn đề cần khắc phục */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 mb-2.5">
                                <TrendingUp className="h-4 w-4 text-emerald-600" />
                                <span>Điểm sáng được đánh giá cao nhất</span>
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

                        <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 mb-2.5">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <span>Điểm nghẽn cần ưu tiên khắc phục</span>
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
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-2.5">
                                <Building2 className="h-4 w-4 text-emerald-600" />
                                <span>Khuyến nghị hành động cụ thể cho từng Ban chuyên môn</span>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {report.departmentActions.map((da, idx) => (
                                    <div
                                        key={idx}
                                        className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs space-y-1.5"
                                    >
                                        <span className="inline-block rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
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
                        <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-bold text-rose-900">
                                        💡 Phát hiện vấn đề lặp lại có thể lưu thành Bài học Sự cố (Post-Mortem)
                                    </span>
                                    <p className="text-[11px] text-rose-700">
                                        Chuyển hóa góp ý tiêu cực trong Feedback thành bản ghi Sự cố để mùa sau không lặp lại lỗi này.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-3 space-y-2.5">
                                {report.suggestedIncidents.map((inc, idx) => {
                                    const isSaved = savedIncidentIdx.has(idx);
                                    const isSaving = savingIncidentIdx === idx;
                                    return (
                                        <div
                                            key={idx}
                                            className="flex flex-col gap-3 rounded-xl bg-white p-3.5 border border-rose-100 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div className="space-y-1 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                                        {inc.severity}
                                                    </span>
                                                    <span className="font-bold text-slate-900">
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
                                                className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
                                                    isSaved
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : 'bg-rose-600 text-white hover:bg-rose-700'
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
                                                        ? 'Đã lưu vào Nhật ký Sự cố'
                                                        : 'Lưu vào Post-Mortem'}
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
