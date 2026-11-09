import { useState } from 'react';
import { button, ErrorNotice, field, panel } from '../../components/ui/CrudUi';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { useSuccessToast } from '../../components/ui/toastContext';
import { EVENT_STATUS_ACTION } from '../../constants/enum/event';
import { useMutation } from '../../hooks/useMutation';
import { eventService } from '../../services/eventService';
import type { EventResponse, EventStatus, EventStatusRequest } from '../../types/models/event';
import { statusOptions } from './statusOptions';

export function EventStatusForm({ event, onSaved }: { event: EventResponse; onSaved: (event: EventResponse) => void }) {
    const options = statusOptions(event.status);
    const [target, setTarget] = useState<EventStatus | ''>('');
    const [pending, setPending] = useState<EventStatusRequest | null>(null);
    const { busy, error, mutate } = useMutation();
    const notify = useSuccessToast();
    if (!options.length) return null;
    // Mùa cũ thiếu ngày bắt đầu cần bổ sung ngày này cùng ngày kết thúc khi hoàn thành.
    const needsStart = target === 'IN_PROGRESS' || (target === 'COMPLETED' && !event.actualStartDate);

    async function save(request: EventStatusRequest) {
        const changed = await eventService.updateStatus(event.id, request);
        setPending(null);
        setTarget('');
        onSaved(changed);
        notify('Đã cập nhật trạng thái sự kiện.');
    }

    return <><form className={`${panel} space-y-3`} onSubmit={(form) => {
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
            const request = {
                status: target,
                ...(needsStart ? { actualStartDate } : {}),
                ...(target === 'COMPLETED' ? { actualEndDate } : {}),
            };
            if (target === 'APPROVED' || target === 'CANCELLED') setPending(request);
            else await save(request);
        });
    }}>
        <h2 className="text-lg font-semibold">Chuyển trạng thái</h2>
        {!pending && <ErrorNotice error={error} />}
        <label className="block">Trạng thái mới<select className={field} value={target} required onChange={(input) => setTarget(input.target.value as EventStatus | '')}>
            <option value="">Chọn trạng thái</option>
            {options.map((status) => <option value={status} key={status}>{EVENT_STATUS_ACTION[status]}</option>)}
        </select></label>
        {needsStart && <label className="block">Ngày bắt đầu thực tế<input className={field} name="actualStartDate" type="date" required /></label>}
        {target === 'COMPLETED' && <label className="block">Ngày kết thúc thực tế<input className={field} name="actualEndDate" type="date" min={event.actualStartDate ?? undefined} required /></label>}
        <button className={button} disabled={busy || !target}>Cập nhật trạng thái</button>
    </form>
        {pending && <ConfirmationDialog title={EVENT_STATUS_ACTION[pending.status]}
            message={`Bạn có muốn xác nhận thay đổi trạng thái của sự kiện ${event.title}?`}
            busy={busy} error={error} onCancel={() => setPending(null)}
            onConfirm={() => void mutate(() => save(pending))} />}
    </>;
}
