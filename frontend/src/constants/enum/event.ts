import type { EventStatus } from '../../types/models/event';

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

export { EVENT_ROLE_LABEL as ORGANIZER_ROLE_LABEL } from './role';
