export type DocumentDocType =
    | 'MASTER_PLAN'
    | 'RUNNING_ORDER'
    | 'SPONSOR_PROPOSAL'
    | 'MEETING_MINUTES'
    | 'RISK_PLAN'
    | 'OTHER';

export type ApprovalStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface DocumentResponse {
    id: string;
    eventId: string;
    parentDocumentId: string | null;
    docType: DocumentDocType;
    title: string;
    version: string;
    fileUrl: string;
    uploadedBy: string;
    status: ApprovalStatus;
    approvedBy: string | null;
    approvedAt: string | null;
    rejectionReason: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateDocumentRequest {
    parentDocumentId?: string | null;
    docType: DocumentDocType;
    title: string;
    version?: string;
    fileUrl: string;
    uploadedBy: string;
}

export interface DocumentApprovalRequest {
    status: ApprovalStatus;
    approvedBy: string;
    rejectionReason?: string | null;
}

export const DOC_TYPE_LABELS: Record<DocumentDocType, string> = {
    MASTER_PLAN: 'Kế hoạch tổng thể',
    RUNNING_ORDER: 'Kịch bản chạy chương trình',
    SPONSOR_PROPOSAL: 'Hồ sơ kêu gọi tài trợ',
    MEETING_MINUTES: 'Biên bản cuộc họp',
    RISK_PLAN: 'Phương án quản trị rủi ro',
    OTHER: 'Tài liệu khác',
};

export const APPROVAL_STATUS_CONFIG: Record<
    ApprovalStatus,
    { label: string; color: string; bg: string; border: string }
> = {
    DRAFT: {
        label: 'Bản nháp',
        color: 'text-slate-600',
        bg: 'bg-slate-100',
        border: 'border-slate-200',
    },
    PENDING: {
        label: 'Chờ duyệt',
        color: 'text-amber-700',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
    },
    APPROVED: {
        label: 'Đã phê duyệt',
        color: 'text-emerald-700',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
    },
    REJECTED: {
        label: 'Đã từ chối',
        color: 'text-rose-700',
        bg: 'bg-rose-50',
        border: 'border-rose-200',
    },
};
