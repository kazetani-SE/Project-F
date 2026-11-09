import type { EventStatus, OrganizerRole } from '../../types/models/event';

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
    PLANNING: 'Đang lên kế hoạch',
    APPROVED: 'Đã duyệt kế hoạch',
    IN_PROGRESS: 'Đang diễn ra',
    COMPLETED: 'Đã hoàn thành',
    CANCELLED: 'Đã hủy',
};

export const EVENT_STATUS_ACTION: Record<EventStatus, string> = {
    PLANNING: 'Lên kế hoạch',
    APPROVED: 'Duyệt kế hoạch',
    IN_PROGRESS: 'Bắt đầu sự kiện',
    COMPLETED: 'Hoàn thành sự kiện',
    CANCELLED: 'Hủy sự kiện',
};

export const ORGANIZER_ROLE_LABEL: Record<OrganizerRole, string> = {
    MASTER_PLAN: 'Kế hoạch tổng thể',
    RUNNING_ORDER: 'Kịch bản chương trình',
    SPONSOR_PROPOSAL: 'Hồ sơ tài trợ',
    MEETING_MINUTES: 'Biên bản họp',
    RISK_PLAN: 'Kế hoạch rủi ro',
    MEMBER: 'Thành viên BTC',
};
