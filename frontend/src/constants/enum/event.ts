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
    LEAD_HEADER: 'Trưởng BTC',
    HR: 'Ban Nhân sự',
    PLAN: 'Ban Kế hoạch',
    MEDIA: 'Ban Truyền thông',
    MEMBER: 'Thành viên BTC',
};
