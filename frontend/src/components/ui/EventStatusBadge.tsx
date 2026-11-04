import type { EventStatus } from '../../types/models/event.ts';

interface Props {
    status: EventStatus;
    variant?: 'dot' | 'badge';
}

export default function EventStatusBadge({ status, variant = 'dot' }: Props) {
    if (status === 'IN_PROGRESS' || variant === 'badge') {
        if (status === 'IN_PROGRESS') {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    Đang diễn ra
                </span>
            );
        }
    }

    switch (status) {
        case 'APPROVED':
            return (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Đã duyệt kế hoạch
                </span>
            );
        case 'PLANNING':
            return (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Đang lên kế hoạch
                </span>
            );
        case 'COMPLETED':
            return (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    Đã hoàn thành
                </span>
            );
        case 'CANCELLED':
            return (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    Đã hủy
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    {status}
                </span>
            );
    }
}
