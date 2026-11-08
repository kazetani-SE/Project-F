import { isClubAdmin, useAuth } from '../../../context/authContext';
import { ErrorNotice } from '../../../components/ui/CrudUi';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
    BarChart3,
    ListFilter,
    Users,
    MessageSquareText,
    Sparkles,
    CheckCircle2,
    ArrowUpDown,
    Check,
    RotateCcw,
} from 'lucide-react';
import {
    getFeedbacksByEvent,
    getFeedbackSummaryByEvent,
} from '../../../services/knowledgeService';
import { getPresignedDownloadUrl } from '../../../services/storageService';
import { FeedbackImportModal } from './FeedbackImportModal';
import {
    aggregateFeedbackQuestions,
    extractStructuredFeedback,
    isTrivialSuggestionAnswer,
} from '../../../utils/excelParser';
import {
    type FeedbackResponse,
    type FeedbackSummaryResponse,
    FEEDBACK_SOURCE_LABELS,
} from '../../../types/models/knowledge';

interface Props {
    eventId: string;
}

const ITEMS_PER_PAGE = 8;

type ViewMode = 'QUESTIONS' | 'RESPONDENTS';

type QuestionSortOption =
    | 'FORM_ORDER'
    | 'SCORE_DESC'
    | 'SCORE_ASC'
    | 'RESPONSES_DESC'
    | 'SUGGESTIONS_DESC';

type RespondentSortOption =
    | 'NEWEST'
    | 'OLDEST'
    | 'SCORE_DESC'
    | 'SCORE_ASC'
    | 'SUGGESTIONS_DESC';

const QUESTION_SORT_OPTIONS: {
    value: QuestionSortOption;
    label: string;
    description: string;
}[] = [
    {
        value: 'FORM_ORDER',
        label: 'Thứ tự gốc trong Form',
        description: 'Giữ nguyên thứ tự câu hỏi xuất hiện trong tệp Excel',
    },
    {
        value: 'SCORE_DESC',
        label: 'Điểm đánh giá: Cao → Thấp',
        description: 'Ưu tiên các câu hỏi được chấm điểm trung bình cao nhất lên đầu',
    },
    {
        value: 'SCORE_ASC',
        label: 'Điểm đánh giá: Thấp → Cao (Cần chú ý)',
        description: 'Ưu tiên các tiêu chí có điểm thấp nhất để dễ nhận diện vấn đề',
    },
    {
        value: 'RESPONSES_DESC',
        label: 'Số lượt chấm điểm: Nhiều → Ít',
        description: 'Sắp xếp theo số lượng người trả lời câu hỏi chấm điểm',
    },
    {
        value: 'SUGGESTIONS_DESC',
        label: 'Nhiều ý kiến đề xuất chi tiết nhất',
        description: 'Đưa các câu hỏi tự luận có nhiều góp ý thực chất lên đầu',
    },
];

const RESPONDENT_SORT_OPTIONS: {
    value: RespondentSortOption;
    label: string;
    description: string;
}[] = [
    {
        value: 'NEWEST',
        label: 'Thời gian gửi: Mới nhất trước',
        description: 'Hiển thị các phiếu phản hồi vừa được import gần đây nhất',
    },
    {
        value: 'OLDEST',
        label: 'Thời gian gửi: Cũ nhất trước',
        description: 'Hiển thị theo trình tự thời gian từ đầu đến cuối',
    },
    {
        value: 'SCORE_DESC',
        label: 'Điểm trung bình phiếu: Cao → Thấp',
        description: 'Xem các cá nhân đánh giá sự kiện tích cực nhất trước',
    },
    {
        value: 'SCORE_ASC',
        label: 'Điểm trung bình phiếu: Thấp → Cao',
        description: 'Xem các cá nhân chấm điểm khắt khe nhất trước',
    },
    {
        value: 'SUGGESTIONS_DESC',
        label: 'Nhiều câu trả lời đề xuất nhất',
        description: 'Ưu tiên phiếu của những người viết nhiều góp ý tự luận chi tiết',
    },
];

export const FeedbackSection: React.FC<Props> = ({ eventId }) => {
    const canWrite = isClubAdmin(useAuth().user?.clubRole);
    const [feedbacks, setFeedbacks] = useState<FeedbackResponse[]>([]);
    const [summary, setSummary] = useState<FeedbackSummaryResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // View mode: QUESTIONS (Thống kê theo từng câu hỏi & đề xuất) | RESPONDENTS (Danh sách từng người điền)
    const [viewMode, setViewMode] = useState<ViewMode>('QUESTIONS');

    // Hide trivial answers ("Không", "No", "Nothing", etc.) in Question view
    const [hideTrivialAnswers, setHideTrivialAnswers] = useState<boolean>(true);

    // Filters & Search
    const [selectedSource, setSelectedSource] = useState<string>('ALL');
    const [selectedRating, setSelectedRating] = useState<string>('ALL');
    const [searchKeyword, setSearchKeyword] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(1);

    // Sort states & popover
    const [isSortOpen, setIsSortOpen] = useState<boolean>(false);
    const [questionSortBy, setQuestionSortBy] = useState<QuestionSortOption>('FORM_ORDER');
    const [respondentSortBy, setRespondentSortBy] = useState<RespondentSortOption>('NEWEST');
    const sortPopoverRef = useRef<HTMLDivElement | null>(null);

    // Modal state
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Collapsible state for individual feedback cards
    const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set());

    // Close sort popover when clicking outside or pressing Escape
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                sortPopoverRef.current &&
                !sortPopoverRef.current.contains(event.target as Node)
            ) {
                setIsSortOpen(false);
            }
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsSortOpen(false);
            }
        };

        if (isSortOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isSortOpen]);

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
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải dữ liệu khảo sát & feedback',
            );
        } finally {
            setIsLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const [downloadError, setDownloadError] = useState<unknown>(null);
    const handleOpenAttachment = async (fileUrl: string) => {
        setDownloadError(null);
        try {
            const res = await getPresignedDownloadUrl(fileUrl);
            window.open(res.downloadUrl, '_blank', 'noopener,noreferrer');
        } catch (error) {
            setDownloadError(error);
        }
    };

    const extractFileName = (fileUrl: string) => {
        const parts = fileUrl.split('/');
        const lastPart = parts[parts.length - 1] || 'khao_sat_form.xlsx';
        return decodeURIComponent(lastPart.split('?')[0]);
    };

    // 1. Base Feedbacks (chỉ lọc theo Đối tượng / Số sao, KHÔNG lọc theo ô Search để Bảng Tổng Quan luôn cố định)
    const baseFeedbacks = useMemo(() => {
        return feedbacks.filter((fb) => {
            if (selectedSource !== 'ALL' && fb.sourceType !== selectedSource) {
                return false;
            }
            if (selectedRating !== 'ALL' && fb.ratingScore !== Number(selectedRating)) {
                return false;
            }
            return true;
        });
    }, [feedbacks, selectedSource, selectedRating]);

    // Thống kê câu hỏi gốc (dùng cố định cho Bảng Tổng Quan ở trên đầu trang)
    const overviewStats = useMemo(
        () => aggregateFeedbackQuestions(baseFeedbacks),
        [baseFeedbacks],
    );

    // 2. Lọc danh sách Câu hỏi chấm điểm & Câu hỏi đề xuất theo từ khóa tìm kiếm (cho Chế độ 1: QUESTIONS)
    const sortedRatingQuestions = useMemo(() => {
        const kw = searchKeyword.trim().toLowerCase();
        const filtered = kw
            ? overviewStats.ratingQuestions.filter((rq) =>
                  rq.question.toLowerCase().includes(kw),
              )
            : [...overviewStats.ratingQuestions];

        if (questionSortBy === 'SCORE_DESC') {
            filtered.sort(
                (a, b) =>
                    b.averageScore / b.scaleMax - a.averageScore / a.scaleMax ||
                    b.responseCount - a.responseCount,
            );
        } else if (questionSortBy === 'SCORE_ASC') {
            filtered.sort(
                (a, b) =>
                    a.averageScore / a.scaleMax - b.averageScore / b.scaleMax ||
                    b.responseCount - a.responseCount,
            );
        } else if (questionSortBy === 'RESPONSES_DESC') {
            filtered.sort(
                (a, b) =>
                    b.responseCount - a.responseCount ||
                    b.averageScore / b.scaleMax - a.averageScore / a.scaleMax,
            );
        }
        return filtered;
    }, [overviewStats.ratingQuestions, questionSortBy, searchKeyword]);

    const sortedSuggestionQuestions = useMemo(() => {
        const kw = searchKeyword.trim().toLowerCase();
        const filtered = kw
            ? overviewStats.suggestionQuestions
                  .map((sq) => {
                      const questionMatches = sq.question.toLowerCase().includes(kw);
                      if (questionMatches) {
                          return sq;
                      }
                      const matchingAnswers = sq.answers.filter(
                          (ans) =>
                              ans.answer.toLowerCase().includes(kw) ||
                              ans.respondentLabel.toLowerCase().includes(kw) ||
                              ans.tags.some((t) => t.toLowerCase().includes(kw)),
                      );
                      if (matchingAnswers.length === 0) return null;
                      return {
                          ...sq,
                          answers: matchingAnswers,
                          totalAnswers: matchingAnswers.length,
                          meaningfulCount: matchingAnswers.filter((a) => !a.isTrivial).length,
                      };
                  })
                  .filter((item): item is NonNullable<typeof item> => item !== null)
            : [...overviewStats.suggestionQuestions];

        if (questionSortBy === 'SUGGESTIONS_DESC') {
            filtered.sort(
                (a, b) =>
                    b.meaningfulCount - a.meaningfulCount || b.totalAnswers - a.totalAnswers,
            );
        } else if (questionSortBy === 'RESPONSES_DESC') {
            filtered.sort(
                (a, b) =>
                    b.totalAnswers - a.totalAnswers || b.meaningfulCount - a.meaningfulCount,
            );
        }
        return filtered;
    }, [overviewStats.suggestionQuestions, questionSortBy, searchKeyword]);

    // 3. Lọc và sắp xếp danh sách Phiếu trả lời cá nhân (cho Chế độ 2: RESPONDENTS)
    const sortedRespondentFeedbacks = useMemo(() => {
        const kw = searchKeyword.trim().toLowerCase();
        const list = kw
            ? baseFeedbacks.filter((fb) => {
                  const ext = extractStructuredFeedback(fb);
                  const metaMatch = Object.values(ext.metadata).some((v) =>
                      v.toLowerCase().includes(kw),
                  );
                  const suggestionMatch = ext.suggestions.some(
                      (s) =>
                          s.answer.toLowerCase().includes(kw) ||
                          s.question.toLowerCase().includes(kw),
                  );
                  const ratingQuestionMatch = ext.ratings.some((r) =>
                      r.question.toLowerCase().includes(kw),
                  );
                  const hlMatch = fb.highlightContent?.toLowerCase().includes(kw);
                  const impMatch = fb.improvementContent?.toLowerCase().includes(kw);
                  return (
                      Boolean(metaMatch) ||
                      Boolean(suggestionMatch) ||
                      Boolean(ratingQuestionMatch) ||
                      Boolean(hlMatch) ||
                      Boolean(impMatch)
                  );
              })
            : [...baseFeedbacks];

        list.sort((a, b) => {
            if (respondentSortBy === 'NEWEST') {
                return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
            }
            if (respondentSortBy === 'OLDEST') {
                return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
            }

            const extA = extractStructuredFeedback(a);
            const extB = extractStructuredFeedback(b);

            if (respondentSortBy === 'SCORE_DESC') {
                const normA = extA.overallRawScore / extA.overallScaleMax;
                const normB = extB.overallRawScore / extB.overallScaleMax;
                return normB - normA;
            }
            if (respondentSortBy === 'SCORE_ASC') {
                const normA = extA.overallRawScore / extA.overallScaleMax;
                const normB = extB.overallRawScore / extB.overallScaleMax;
                return normA - normB;
            }
            if (respondentSortBy === 'SUGGESTIONS_DESC') {
                const countA = extA.suggestions.filter(
                    (s) => !isTrivialSuggestionAnswer(s.answer),
                ).length;
                const countB = extB.suggestions.filter(
                    (s) => !isTrivialSuggestionAnswer(s.answer),
                ).length;
                return countB - countA;
            }
            return 0;
        });
        return list;
    }, [baseFeedbacks, respondentSortBy, searchKeyword]);

    // Distinct uploaded Excel files in current event
    const uploadedSourceFiles = useMemo(() => {
        const map = new Map<string, { fileUrl: string; fileName: string; count: number }>();
        for (const fb of feedbacks) {
            if (!fb.fileUrl) continue;
            const existing = map.get(fb.fileUrl);
            if (existing) {
                existing.count += 1;
            } else {
                map.set(fb.fileUrl, {
                    fileUrl: fb.fileUrl,
                    fileName: extractFileName(fb.fileUrl),
                    count: 1,
                });
            }
        }
        return Array.from(map.values());
    }, [feedbacks]);

    // Reset pagination when filter or sort changes
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedSource, selectedRating, searchKeyword, respondentSortBy]);

    // Pagination calculations for RESPONDENTS view
    const totalPages = Math.max(1, Math.ceil(sortedRespondentFeedbacks.length / ITEMS_PER_PAGE));
    const paginatedFeedbacks = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return sortedRespondentFeedbacks.slice(start, start + ITEMS_PER_PAGE);
    }, [sortedRespondentFeedbacks, currentPage]);

    // Active sort label for button display
    const activeSortLabel = useMemo(() => {
        if (viewMode === 'QUESTIONS') {
            return (
                QUESTION_SORT_OPTIONS.find((o) => o.value === questionSortBy)?.label ||
                'Thứ tự gốc'
            );
        }
        return (
            RESPONDENT_SORT_OPTIONS.find((o) => o.value === respondentSortBy)?.label ||
            'Mới nhất trước'
        );
    }, [viewMode, questionSortBy, respondentSortBy]);

    const isNonDefaultSort =
        (viewMode === 'QUESTIONS' && questionSortBy !== 'FORM_ORDER') ||
        (viewMode === 'RESPONDENTS' && respondentSortBy !== 'NEWEST');

    return (
        <div className="space-y-6">
            <ErrorNotice error={downloadError} />
            {/* Toolbar */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                        <h3 className="text-base font-bold text-slate-900">
                            Khảo Sát & Đánh Giá Theo Câu Hỏi (Form Feedback)
                        </h3>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                        Phân tích điểm số trên từng câu hỏi khảo sát (Thang điểm 5, Thang điểm 10) và tổng hợp đề xuất cải tiến từ người tham gia.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {uploadedSourceFiles.length > 0 && (
                        <button
                            type="button"
                            onClick={() => handleOpenAttachment(uploadedSourceFiles[0].fileUrl)}
                            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                            title="Tải tệp feedback gốc"
                        >
                            <Download className="h-4 w-4 text-emerald-600" />
                            <span>Tải file feedback</span>
                        </button>
                    )}

                    {canWrite && (
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
                        >
                            <FileUp className="h-4 w-4" />
                            <span>Import File Excel Từ Form</span>
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
                    <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                    <span>{error}</span>
                </div>
            )}

            {/* Dashboard Thống kê tổng quan (Luôn cố định điểm gốc, không bị thay đổi khi gõ vào ô Search) */}
            {summary && feedbacks.length > 0 && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                    {/* Left: Overall Scale Score & 5-Star Equivalent */}
                    <div className="lg:col-span-4 flex flex-col items-center justify-center border-b border-slate-100 pb-5 lg:border-b-0 lg:border-r lg:pr-6 lg:pb-0 text-center">
                        <div className="inline-flex items-baseline gap-1.5">
                            <span className="text-4xl font-extrabold text-slate-900">
                                {overviewStats.ratingQuestions.length > 0
                                    ? overviewStats.overallAverageOnScale.toFixed(2)
                                    : summary.averageRating.toFixed(1)}
                            </span>
                            <span className="text-lg font-bold text-slate-400">
                                / {overviewStats.dominantScaleMax}
                            </span>
                        </div>

                        <div className="mt-2 flex items-center gap-1 text-amber-400">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={`h-4 w-4 ${
                                        star <= Math.round(summary.averageRating)
                                            ? 'fill-amber-400 text-amber-400'
                                            : 'text-slate-200'
                                    }`}
                                />
                            ))}
                            <span className="ml-1.5 text-xs font-semibold text-slate-600">
                                ({summary.averageRating.toFixed(2)} / 5★ quy đổi)
                            </span>
                        </div>

                        <p className="mt-2 text-xs font-semibold text-slate-500">
                            Điểm trung bình chung ({baseFeedbacks.length} phiếu khảo sát)
                        </p>

                        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[11px]">
                            <span className="rounded-lg bg-amber-50 px-2.5 py-1 font-bold text-amber-800 border border-amber-200">
                                {overviewStats.ratingQuestions.length} câu hỏi chấm điểm
                            </span>
                            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-bold text-emerald-800 border border-emerald-200">
                                {overviewStats.suggestionQuestions.length} câu hỏi đề xuất
                            </span>
                        </div>
                    </div>

                    {/* Right: Quick summary of top rating criteria or 1-5 star breakdown */}
                    <div className="lg:col-span-8 flex flex-col justify-center space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                            <span>Tóm tắt điểm trung bình theo từng câu hỏi đánh giá:</span>
                            <span className="text-[11px] font-medium text-slate-400">
                                Thang điểm gốc: 1 – {overviewStats.dominantScaleMax}
                            </span>
                        </div>

                        {overviewStats.ratingQuestions.length > 0 ? (
                            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                                {overviewStats.ratingQuestions.map((rq, idx) => {
                                    const pct = Math.min(
                                        100,
                                        Math.round((rq.averageScore / rq.scaleMax) * 100),
                                    );
                                    return (
                                        <div key={rq.question} className="space-y-1">
                                            <div className="flex items-center justify-between gap-2 text-xs">
                                                <span className="font-medium text-slate-700 truncate">
                                                    <span className="font-bold text-slate-400 mr-1.5">
                                                        Q{idx + 1}.
                                                    </span>
                                                    {rq.question}
                                                </span>
                                                <span className="shrink-0 font-extrabold text-slate-900">
                                                    {rq.averageScore.toFixed(2)}{' '}
                                                    <span className="text-slate-400 font-semibold">
                                                        / {rq.scaleMax}
                                                    </span>
                                                </span>
                                            </div>
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className="h-full rounded-full bg-amber-400 transition-all duration-500"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {[5, 4, 3, 2, 1].map((star) => {
                                    const count = summary.ratingBreakdown[star] || 0;
                                    const percent =
                                        summary.totalFeedbacks > 0
                                            ? Math.round((count / summary.totalFeedbacks) * 100)
                                            : 0;
                                    return (
                                        <div
                                            key={star}
                                            className="flex items-center gap-3 text-xs"
                                        >
                                            <span className="w-12 font-semibold text-slate-600">
                                                {star} sao
                                            </span>
                                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className="h-full rounded-full bg-amber-400"
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                            <span className="w-16 text-right text-slate-400 font-medium">
                                                {count} ({percent}%)
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* View Switcher, Sort Button Popover & Filter Bar */}
            <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between border-y border-slate-100 py-3">
                {/* Left: View Mode Tabs & Source Filter */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                        <button
                            type="button"
                            onClick={() => setViewMode('QUESTIONS')}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                                viewMode === 'QUESTIONS'
                                    ? 'bg-white text-emerald-700 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <BarChart3 className="h-3.5 w-3.5" />
                            <span>
                                Phân tích theo Câu hỏi (
                                {sortedRatingQuestions.length + sortedSuggestionQuestions.length}
                                )
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('RESPONDENTS')}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                                viewMode === 'RESPONDENTS'
                                    ? 'bg-white text-emerald-700 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Users className="h-3.5 w-3.5" />
                            <span>
                                Chi tiết từng Phiếu trả lời ({sortedRespondentFeedbacks.length})
                            </span>
                        </button>
                    </div>

                    {/* Source Filter Dropdown */}
                    <select
                        aria-label="Lọc theo nhóm đối tượng"
                        value={selectedSource}
                        onChange={(e) => setSelectedSource(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-emerald-500 focus:outline-hidden"
                    >
                        <option value="ALL">Tất cả đối tượng ({feedbacks.length})</option>
                        {Object.entries(FEEDBACK_SOURCE_LABELS).map(([k, v]) => {
                            const cnt = feedbacks.filter((f) => f.sourceType === k).length;
                            if (cnt === 0) return null;
                            return (
                                <option key={k} value={k}>
                                    {v} ({cnt})
                                </option>
                            );
                        })}
                    </select>

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

                {/* Right: Sort Button Popover & Search Box */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
                    {/* Sort Trigger Button & Popover Window */}
                    <div ref={sortPopoverRef} className="relative">
                        <button
                            type="button"
                            onClick={() => setIsSortOpen((prev) => !prev)}
                            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-all shadow-2xs ${
                                isSortOpen || isNonDefaultSort
                                    ? 'border-emerald-300 bg-emerald-50/80 text-emerald-800'
                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            <ArrowUpDown className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Sắp xếp:</span>
                            <span className="font-bold max-w-44 truncate">{activeSortLabel}</span>
                            <ChevronDown
                                className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                                    isSortOpen ? 'rotate-180' : ''
                                }`}
                            />
                        </button>

                        {/* Floating Sort Window (Popover with fixed viewport height & internal scroll) */}
                        {isSortOpen && (
                            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white shadow-xl z-30 animate-in fade-in zoom-in-95 duration-150 flex flex-col overflow-hidden">
                                {/* Fixed Header of Popover */}
                                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/60 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
                                            <ArrowUpDown className="h-3.5 w-3.5" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-900">
                                                Tùy Chọn Sắp Xếp Hiển Thị
                                            </h4>
                                            <p className="text-[10px] text-slate-400">
                                                Cuộn lên xuống để chọn tiêu chí sắp xếp
                                            </p>
                                        </div>
                                    </div>

                                    {(questionSortBy !== 'FORM_ORDER' ||
                                        respondentSortBy !== 'NEWEST') && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setQuestionSortBy('FORM_ORDER');
                                                setRespondentSortBy('NEWEST');
                                            }}
                                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-200/60 hover:text-slate-800 transition-colors"
                                            title="Đặt lại mặc định"
                                        >
                                            <RotateCcw className="h-3 w-3" />
                                            <span>Mặc định</span>
                                        </button>
                                    )}
                                </div>

                                {/* Scrollable List Body inside Popover */}
                                <div className="max-h-64 overflow-y-auto overscroll-contain p-3 space-y-3.5">
                                    {/* Section 1: Sort for Questions View */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1">
                                            <span>1. Sắp xếp Câu hỏi & Đề xuất</span>
                                            {viewMode === 'QUESTIONS' && (
                                                <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700 border border-emerald-200">
                                                    Đang xem
                                                </span>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            {QUESTION_SORT_OPTIONS.map((opt) => {
                                                const isSelected = questionSortBy === opt.value;
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => {
                                                            setQuestionSortBy(opt.value);
                                                            if (viewMode !== 'QUESTIONS') {
                                                                setViewMode('QUESTIONS');
                                                            }
                                                            setIsSortOpen(false);
                                                        }}
                                                        className={`w-full flex items-start justify-between gap-2.5 rounded-xl p-2 text-left transition-colors ${
                                                            isSelected
                                                                ? 'bg-emerald-50/90 border border-emerald-200 text-emerald-900'
                                                                : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                                                        }`}
                                                    >
                                                        <div className="space-y-0.5">
                                                            <p className="text-xs font-bold">
                                                                {opt.label}
                                                            </p>
                                                            <p className="text-[11px] text-slate-500 leading-snug">
                                                                {opt.description}
                                                            </p>
                                                        </div>
                                                        {isSelected && (
                                                            <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Section 2: Sort for Respondents View */}
                                    <div className="space-y-1.5 border-t border-slate-100 pt-3">
                                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1">
                                            <span>2. Sắp xếp Phiếu trả lời cá nhân</span>
                                            {viewMode === 'RESPONDENTS' && (
                                                <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700 border border-emerald-200">
                                                    Đang xem
                                                </span>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            {RESPONDENT_SORT_OPTIONS.map((opt) => {
                                                const isSelected = respondentSortBy === opt.value;
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => {
                                                            setRespondentSortBy(opt.value);
                                                            if (viewMode !== 'RESPONDENTS') {
                                                                setViewMode('RESPONDENTS');
                                                            }
                                                            setIsSortOpen(false);
                                                        }}
                                                        className={`w-full flex items-start justify-between gap-2.5 rounded-xl p-2 text-left transition-colors ${
                                                            isSelected
                                                                ? 'bg-emerald-50/90 border border-emerald-200 text-emerald-900'
                                                                : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                                                        }`}
                                                    >
                                                        <div className="space-y-0.5">
                                                            <p className="text-xs font-bold">
                                                                {opt.label}
                                                            </p>
                                                            <p className="text-[11px] text-slate-500 leading-snug">
                                                                {opt.description}
                                                            </p>
                                                        </div>
                                                        {isSelected && (
                                                            <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Search Box */}
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                            type="text"
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            placeholder="Tìm câu hỏi, đề xuất, tên ứng viên..."
                            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:border-emerald-500 focus:outline-hidden"
                        />
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {isLoading ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    <p className="text-xs">Đang tải dữ liệu khảo sát & phân tích câu hỏi…</p>
                </div>
            ) : baseFeedbacks.length === 0 ? (
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
                            : 'Thử điều chỉnh lại bộ lọc đối tượng hoặc số sao.'}
                    </p>
                </div>
            ) : viewMode === 'QUESTIONS' &&
              sortedRatingQuestions.length === 0 &&
              sortedSuggestionQuestions.length === 0 ? (
                <div className="flex h-56 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                    <Search className="h-8 w-8 text-slate-400" />
                    <h3 className="mt-2.5 text-sm font-semibold text-slate-700">
                        Không tìm thấy câu hỏi hoặc đề xuất nào khớp với &ldquo;{searchKeyword}&rdquo;
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                        Bảng tổng quan ở trên vẫn giữ nguyên dữ liệu gốc. Hãy thử từ khóa khác hoặc xóa tìm kiếm.
                    </p>
                </div>
            ) : viewMode === 'RESPONDENTS' && sortedRespondentFeedbacks.length === 0 ? (
                <div className="flex h-56 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                    <Search className="h-8 w-8 text-slate-400" />
                    <h3 className="mt-2.5 text-sm font-semibold text-slate-700">
                        Không tìm thấy phiếu trả lời nào khớp với &ldquo;{searchKeyword}&rdquo;
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                        Bảng tổng quan ở trên vẫn giữ nguyên dữ liệu gốc. Hãy thử từ khóa khác hoặc xóa tìm kiếm.
                    </p>
                </div>
            ) : viewMode === 'QUESTIONS' ? (
                /* =========================================================
                   CHẾ ĐỘ 1: PHÂN TÍCH THEO TỪNG CÂU HỎI (QUESTION BREAKDOWN)
                   ========================================================= */
                <div className="space-y-8">
                    {/* Khối 1: Các Câu Hỏi Chấm Điểm (Rating Criteria) */}
                    {sortedRatingQuestions.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="rounded-lg bg-amber-100 p-1.5 text-amber-700">
                                        <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900">
                                            1. Điểm Đánh Giá Chi Tiết Theo Từng Câu Hỏi ({sortedRatingQuestions.length} câu hỏi)
                                        </h4>
                                        <p className="text-[11px] text-slate-500">
                                            Điểm trung bình và phân bố mức điểm của người điền trên từng tiêu chí cụ thể trong Form
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {sortedRatingQuestions.map((rq, index) => {
                                    const pct = Math.min(
                                        100,
                                        Math.round((rq.averageScore / rq.scaleMax) * 100),
                                    );
                                    const sortedScores = Object.entries(rq.distribution)
                                        .map(([scoreStr, cnt]) => ({
                                            score: Number(scoreStr),
                                            count: cnt,
                                        }))
                                        .sort((a, b) => b.score - a.score);

                                    return (
                                        <div
                                            key={rq.question}
                                            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col justify-between gap-4 hover:border-amber-300 transition-colors"
                                        >
                                            <div className="space-y-2">
                                                <div className="flex items-start justify-between gap-3">
                                                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 shrink-0">
                                                        Câu {index + 1} • Thang {rq.scaleMax}
                                                    </span>
                                                    <span className="text-[11px] font-medium text-slate-400">
                                                        {rq.responseCount} lượt chấm
                                                    </span>
                                                </div>
                                                <h5 className="text-xs font-bold text-slate-800 leading-relaxed">
                                                    {rq.question}
                                                </h5>
                                            </div>

                                            <div className="space-y-3 border-t border-slate-100 pt-3">
                                                {/* Average score & progress bar */}
                                                <div className="flex items-baseline justify-between">
                                                    <div>
                                                        <span className="text-2xl font-extrabold text-amber-600">
                                                            {rq.averageScore.toFixed(2)}
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-400">
                                                            {' '}
                                                            / {rq.scaleMax} điểm
                                                        </span>
                                                    </div>
                                                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                                        Đạt {pct}%
                                                    </span>
                                                </div>

                                                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                                                    <div
                                                        className="h-full rounded-full bg-amber-400 transition-all duration-500"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>

                                                {/* Score distribution pills */}
                                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                    <span className="text-[11px] text-slate-400 mr-1">
                                                        Phân bố điểm:
                                                    </span>
                                                    {sortedScores.map((item) => (
                                                        <span
                                                            key={item.score}
                                                            className="inline-flex items-center gap-1 rounded-lg bg-amber-50/80 border border-amber-200/80 px-2 py-0.5 text-[11px] font-semibold text-amber-900"
                                                        >
                                                            <span>
                                                                {item.score}/{rq.scaleMax}đ:
                                                            </span>
                                                            <strong className="text-amber-700">
                                                                {item.count} người
                                                            </strong>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Khối 2: Các Câu Hỏi Tự Luận / Đề Xuất Cải Tiến (Suggestions & Open-ended Questions) */}
                    {sortedSuggestionQuestions.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
                                        <MessageSquareText className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900">
                                            2. Danh Sách Câu Hỏi Đề Xuất & Góp Ý Tự Luận ({sortedSuggestionQuestions.length} câu hỏi)
                                        </h4>
                                        <p className="text-[11px] text-slate-500">
                                            Tổng hợp toàn bộ ý kiến đóng góp, nhận xét và đề xuất cải thiện của người điền theo từng câu hỏi
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setHideTrivialAnswers((prev) => !prev)}
                                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                        hideTrivialAnswers
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    <ListFilter className="h-3.5 w-3.5" />
                                    <span>
                                        {hideTrivialAnswers
                                            ? 'Đang ẩn câu trả lời "Không / No"'
                                            : 'Ẩn các câu trả lời "Không / No"'}
                                    </span>
                                </button>
                            </div>

                            <div className="space-y-4">
                                {sortedSuggestionQuestions.map((sq, qIdx) => {
                                    const visibleAnswers = hideTrivialAnswers
                                        ? sq.answers.filter((a) => !a.isTrivial)
                                        : sq.answers;
                                    const hiddenCount = sq.totalAnswers - visibleAnswers.length;

                                    return (
                                        <div
                                            key={sq.question}
                                            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3.5"
                                        >
                                            <div className="flex items-start justify-between gap-3 flex-wrap border-b border-slate-100 pb-3">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                                                            Câu hỏi tự luận #{qIdx + 1}
                                                        </span>
                                                        <span className="text-[11px] text-slate-500 font-medium">
                                                            {sq.meaningfulCount} đề xuất chi tiết / {sq.totalAnswers} phản hồi
                                                        </span>
                                                    </div>
                                                    <h5 className="text-sm font-bold text-slate-900">
                                                        {sq.question}
                                                    </h5>
                                                </div>

                                                {hiddenCount > 0 && (
                                                    <span className="text-[11px] text-slate-400 italic">
                                                        (Đã ẩn {hiddenCount} câu trả lời &quot;Không / No&quot;)
                                                    </span>
                                                )}
                                            </div>

                                            {visibleAnswers.length === 0 ? (
                                                <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500">
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                                    <span>
                                                        Tất cả người điền đều trả lời &quot;Không / Không có vấn đề gì&quot; cho câu hỏi này.
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                                    {visibleAnswers.map((ans, aIdx) => (
                                                        <div
                                                            key={`${ans.feedbackId}-${aIdx}`}
                                                            className={`rounded-xl border p-3 text-xs space-y-1.5 ${
                                                                ans.isTrivial
                                                                    ? 'border-slate-100 bg-slate-50/60 text-slate-400'
                                                                    : 'border-slate-200/80 bg-slate-50/40 text-slate-800'
                                                            }`}
                                                        >
                                                            <p className="leading-relaxed font-medium break-words">
                                                                &ldquo;{ans.answer}&rdquo;
                                                            </p>
                                                            <div className="flex items-center justify-between gap-2 flex-wrap pt-1 text-[11px] text-slate-400">
                                                                <span className="font-semibold text-slate-500">
                                                                    {ans.respondentLabel}
                                                                </span>
                                                                {ans.tags.length > 0 && (
                                                                    <div className="flex items-center gap-1 flex-wrap">
                                                                        {ans.tags.map((t) => (
                                                                            <span
                                                                                key={t}
                                                                                className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200"
                                                                            >
                                                                                {t}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* =========================================================
                   CHẾ ĐỘ 2: CHI TIẾT TỪNG PHIẾU TRẢ LỜI (RESPONDENTS VIEW)
                   ========================================================= */
                <div className="space-y-3.5">
                    {paginatedFeedbacks.map((fb) => {
                        const fileName = extractFileName(fb.fileUrl);
                        const isExpanded = expandedCardIds.has(fb.id);
                        const extracted = extractStructuredFeedback(fb);
                        const metaEntries = Object.entries(extracted.metadata);
                        const meaningfulSuggestions = extracted.suggestions.filter(
                            (s) => !isTrivialSuggestionAnswer(s.answer),
                        );

                        return (
                            <div
                                key={fb.id}
                                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-slate-300 space-y-4"
                            >
                                {/* Card Header */}
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                    <div className="flex items-start gap-3">
                                        <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700 border border-emerald-100 shrink-0">
                                            <MessageSquare className="h-5 w-5" />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                                                    {FEEDBACK_SOURCE_LABELS[fb.sourceType]}
                                                </span>

                                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-extrabold text-amber-800">
                                                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                                                    <span>
                                                        TB: {extracted.overallRawScore.toFixed(2)} /{' '}
                                                        {extracted.overallScaleMax} điểm
                                                    </span>
                                                </span>

                                                {/* Metadata Badges (Họ tên, MSSV, Bảng thi, Vị trí ứng tuyển...) */}
                                                {metaEntries.map(([k, v]) => (
                                                    <span
                                                        key={k}
                                                        className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                                                    >
                                                        {k.replace(/:$/, '')}:{' '}
                                                        <strong className="text-slate-900">{v}</strong>
                                                    </span>
                                                ))}
                                            </div>

                                            <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                                                <span>
                                                    Import lúc:{' '}
                                                    {new Date(fb.submittedAt).toLocaleString('vi-VN')}
                                                </span>
                                                <span>•</span>
                                                <span className="text-slate-500 font-medium">
                                                    Nguồn: {fileName}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Individual Question Ratings Grid */}
                                {extracted.ratings.length > 0 && (
                                    <div className="rounded-xl bg-amber-50/40 border border-amber-100 p-3.5 space-y-2">
                                        <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                                            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                                            <span>
                                                Điểm chấm từng câu hỏi ({extracted.ratings.length} tiêu chí):
                                            </span>
                                        </span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {extracted.ratings.map((r) => (
                                                <div
                                                    key={r.question}
                                                    className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 border border-amber-100/80 text-xs"
                                                >
                                                    <span
                                                        className="text-slate-700 font-medium line-clamp-2"
                                                        title={r.question}
                                                    >
                                                        {r.question}
                                                    </span>
                                                    <span className="shrink-0 rounded-md bg-amber-100 px-2 py-0.5 font-extrabold text-amber-900">
                                                        {r.score}/{r.scaleMax}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Meaningful Open-ended Suggestions of this Respondent */}
                                {meaningfulSuggestions.length > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                        {meaningfulSuggestions.map((s) => (
                                            <div
                                                key={s.question}
                                                className="rounded-xl bg-emerald-50/50 border border-emerald-100 p-3 text-xs space-y-1"
                                            >
                                                <span className="font-bold text-emerald-900 block">
                                                    {s.question}
                                                </span>
                                                <p className="text-slate-800 leading-relaxed">
                                                    {s.answer}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Collapsible All Questions (including trivial "Không / No" answers) */}
                                {extracted.suggestions.length > meaningfulSuggestions.length && (
                                    <div className="border-t border-slate-100 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => toggleCardExpanded(fb.id)}
                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-emerald-700 transition-colors"
                                        >
                                            <span>
                                                {isExpanded ? 'Thu gọn' : 'Xem toàn bộ'}{' '}
                                                {extracted.suggestions.length} câu trả lời tự luận
                                            </span>
                                            {isExpanded ? (
                                                <ChevronUp className="h-3.5 w-3.5" />
                                            ) : (
                                                <ChevronDown className="h-3.5 w-3.5" />
                                            )}
                                        </button>

                                        {isExpanded && (
                                            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100 text-xs">
                                                {extracted.suggestions.map((s) => (
                                                    <div key={s.question} className="space-y-0.5">
                                                        <span className="text-[11px] font-semibold text-slate-500 block">
                                                            {s.question}
                                                        </span>
                                                        <span className="text-xs text-slate-800 font-medium break-words">
                                                            {s.answer}
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

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
                            <span className="text-slate-500">
                                Hiển thị {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{' '}
                                {Math.min(
                                    currentPage * ITEMS_PER_PAGE,
                                    sortedRespondentFeedbacks.length,
                                )}{' '}
                                trong số {sortedRespondentFeedbacks.length} phiếu phản hồi
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
                                    onClick={() =>
                                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                                    }
                                    disabled={currentPage === totalPages}
                                    className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Feedback Import Modal */}
            <FeedbackImportModal
                eventId={eventId}
                isOpen={canWrite && isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={fetchData}
            />
        </div>
    );
};
