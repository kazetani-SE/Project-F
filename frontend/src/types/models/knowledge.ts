export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type Department = 'HR' | 'PLAN' | 'MEDIA' | 'ACADEMIC';

export interface IncidentResponse {
    id: string;
    eventId: string;
    reportedBy: string | null;
    title: string;
    severity: IncidentSeverity;
    departments: Department[];
    description: string;
    rootCause: string;
    immediateSolution: string;
    lessonLearned: string;
    createdAt: string;
}

export interface CreateIncidentRequest {
    reportedBy?: string | null;
    title: string;
    severity: IncidentSeverity;
    departments: Department[];
    description: string;
    rootCause: string;
    immediateSolution: string;
    lessonLearned: string;
}

export interface FaqResponse {
    id: string;
    seriesId: string;
    question: string;
    answer: string;
    category: string;
    isPinned: boolean;
    updatedAt: string;
}

export interface CreateFaqRequest {
    question: string;
    answer: string;
    category: string;
    isPinned?: boolean;
}

export interface UpdateFaqPinRequest {
    isPinned: boolean;
}

export type FeedbackSourceType = 'ATTENDEE' | 'ORGANIZER' | 'SPONSOR' | 'SPEAKER';

export type FeedbackQuestionRole = 'RATING' | 'SUGGESTION' | 'METADATA' | 'IGNORE';

export interface FeedbackRatingItem {
    question: string;
    score: number;
    scaleMax: number;
}

export interface FeedbackSuggestionItem {
    question: string;
    answer: string;
}

export interface StructuredCustomResponses {
    _schemaVersion?: number;
    _overallRawScore?: number;
    _overallScaleMax?: number;
    metadata?: Record<string, string>;
    ratings?: FeedbackRatingItem[];
    suggestions?: FeedbackSuggestionItem[];
    [key: string]: unknown;
}

export interface FeedbackResponse {
    id: string;
    eventId: string;
    sourceType: FeedbackSourceType;
    fileUrl: string;
    ratingScore: number;
    highlightContent: string | null;
    improvementContent: string | null;
    customResponses: StructuredCustomResponses;
    submittedAt: string;
}

export interface CreateFeedbackRequest {
    sourceType: FeedbackSourceType;
    fileUrl: string;
    ratingScore: number;
    highlightContent?: string | null;
    improvementContent?: string | null;
    customResponses?: StructuredCustomResponses;
}

export interface FeedbackSummaryResponse {
    totalFeedbacks: number;
    averageRating: number;
    ratingBreakdown: Record<number, number>;
}

export const INCIDENT_SEVERITY_CONFIG: Record<
    IncidentSeverity,
    { label: string; color: string; bg: string; border: string }
> = {
    LOW: { label: 'Thấp', color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200' },
    MEDIUM: { label: 'Trung bình', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
    HIGH: { label: 'Cao', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    CRITICAL: { label: 'Nghiêm trọng', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
};

export const DEPARTMENT_LABELS: Record<Department, string> = {
    HR: 'Ban Nhân sự (HR)',
    PLAN: 'Ban Kế hoạch & Tổ chức (PLAN)',
    MEDIA: 'Ban Truyền thông & Ấn phẩm (MEDIA)',
    ACADEMIC: 'Ban Học thuật & Chuyên môn (ACADEMIC)',
};

export const FEEDBACK_SOURCE_LABELS: Record<FeedbackSourceType, string> = {
    ATTENDEE: 'Người tham dự',
    ORGANIZER: 'Ban tổ chức',
    SPONSOR: 'Nhà tài trợ',
    SPEAKER: 'Diễn giả / Khách mời',
};
