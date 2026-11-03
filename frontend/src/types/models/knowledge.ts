export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type Department =
    | 'HR'
    | 'PR_EVENT'
    | 'TECH'
    | 'LOGISTICS'
    | 'PLAN'
    | 'DESIGN'
    | 'MEDIA';

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

export interface FeedbackResponse {
    id: string;
    eventId: string;
    sourceType: FeedbackSourceType;
    fileUrl: string;
    ratingScore: number;
    highlightContent: string | null;
    improvementContent: string | null;
    customResponses: Record<string, unknown>;
    submittedAt: string;
}

export interface CreateFeedbackRequest {
    sourceType: FeedbackSourceType;
    fileUrl: string;
    ratingScore: number;
    highlightContent?: string | null;
    improvementContent?: string | null;
    customResponses?: Record<string, unknown>;
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
    HR: 'Ban Nhân sự',
    PR_EVENT: 'Ban Đối ngoại & Sự kiện',
    TECH: 'Ban Kỹ thuật - Công nghệ',
    LOGISTICS: 'Ban Hậu cần',
    PLAN: 'Ban Kế hoạch & Điều phối',
    DESIGN: 'Ban Thiết kế',
    MEDIA: 'Ban Truyền thông',
};

export const FEEDBACK_SOURCE_LABELS: Record<FeedbackSourceType, string> = {
    ATTENDEE: 'Người tham dự',
    ORGANIZER: 'Ban tổ chức',
    SPONSOR: 'Nhà tài trợ',
    SPEAKER: 'Diễn giả / Khách mời',
};
