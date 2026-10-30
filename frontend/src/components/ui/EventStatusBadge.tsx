import type { EventStatus } from '../../types/models/event.ts';

const MAP: Record<EventStatus, { label: string; cls: string }> = {
    PLANNING: { label: 'Đang lên kế hoạch', cls: 'bg-amber-surface text-amber-800' },
    APPROVED: { label: 'Đã duyệt kế hoạch', cls: 'bg-primary-surface text-primary' },
    IN_PROGRESS: { label: 'Đang diễn ra', cls: 'bg-primary text-white' },
    COMPLETED: { label: 'Đã hoàn thành', cls: 'bg-gray-100 text-muted' },
    CANCELLED: { label: 'Đã hủy', cls: 'bg-danger-bg text-danger' },
};

export default function EventStatusBadge({ status }: { status: EventStatus }) {
    const { label, cls } = MAP[status];
    return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>{label}</span>;
}