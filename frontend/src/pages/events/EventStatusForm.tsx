import { useState } from 'react';
import { button, ErrorNotice, field, panel } from '../../components/ui/CrudUi';
import { useMutation } from '../../hooks/useMutation';
import { eventService } from '../../services/eventService';
import type { EventResponse, EventStatus } from '../../types/models/event';
import { statusOptions } from './statusOptions';

const statusLabels: Record<EventStatus, string> = {
    PLANNING: 'Đang lên kế hoạch',
    APPROVED: 'Duyệt kế hoạch',
    IN_PROGRESS: 'Bắt đầu sự kiện',
    COMPLETED: 'Hoàn thành sự kiện',
    CANCELLED: 'Hủy sự kiện',
};

export function EventStatusForm({ event, onSaved }: { event: EventResponse; onSaved: (event: EventResponse) => void }) {
    const options = statusOptions(event.status);
    const [target, setTarget] = useState<EventStatus | ''>('');
    const { busy, error, mutate } = useMutation();
    if (!options.length) return null;
    const needsStart = target === 'IN_PROGRESS' || (target === 'COMPLETED' && !event.actualStartDate);

    return <form className={`${panel} space-y-3`} onSubmit={(form) => {
        form.preventDefault();
        const data = new FormData(form.currentTarget);
        if (!target) return;
        void mutate(async () => {
            const actualStartDate = String(data.get('actualStartDate') ?? '');
            const actualEndDate = String(data.get('actualEndDate') ?? '');
            const start = actualStartDate || event.actualStartDate;
            if (start && actualEndDate && actualEndDate < start) {
                throw new Error('Ngày kết thúc thực tế phải từ ngày bắt đầu trở đi.');
            }
            const changed = await eventService.updateStatus(event.id, {
                status: target,
                ...(needsStart ? { actualStartDate } : {}),
                ...(target === 'COMPLETED' ? { actualEndDate } : {}),
            });
            setTarget('');
            onSaved(changed);
        });
    }}>
        <h2 className="text-lg font-semibold">Chuyển trạng thái</h2>
        <ErrorNotice error={error} />
        <label className="block">Trạng thái mới<select className={field} value={target} required onChange={(input) => setTarget(input.target.value as EventStatus | '')}>
            <option value="">Chọn trạng thái</option>
            {options.map((status) => <option value={status} key={status}>{statusLabels[status]}</option>)}
        </select></label>
        {needsStart && <label className="block">Ngày bắt đầu thực tế<input className={field} name="actualStartDate" type="date" required /></label>}
        {target === 'COMPLETED' && <label className="block">Ngày kết thúc thực tế<input className={field} name="actualEndDate" type="date" min={event.actualStartDate ?? undefined} required /></label>}
        <button className={button} disabled={busy || !target}>Cập nhật trạng thái</button>
    </form>;
}
