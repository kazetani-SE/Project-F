import { button, ErrorNotice, field, Loading, panel, RetryNotice, secondary } from '../../../components/ui/CrudUi';
import { useMutation } from '../../../hooks/useMutation';
import { useResource } from '../../../hooks/useResource';
import { seriesService } from '../../../services/eventService';
import { loadPages } from '../../../services/loadPages';
import type { EventFields, EventResponse } from '../../../types/models/event';

const loadSeriesOptions = () => loadPages(seriesService.list);

export function EventForm({ event, seriesId, onSave, onCancel }: {
    event?: EventResponse; seriesId?: string; onSave: (data: EventFields) => Promise<void>; onCancel: () => void;
}) {
    const options = useResource(loadSeriesOptions);
    const { busy, error, mutate } = useMutation();
    const selectedSeries = event?.seriesId ?? seriesId ?? '';
    if (options.isLoading) return <Loading />;
    if (!options.data) return <div className="space-y-3"><RetryNotice error={options.error} onRetry={options.reload} />
        <button className={secondary} onClick={onCancel}>Hủy</button>
    </div>;

    return <form className={`${panel} space-y-4`} onSubmit={(input) => {
        input.preventDefault();
        const data = new FormData(input.currentTarget);
        void mutate(async () => {
            const expectedStartDate = String(data.get('expectedStartDate'));
            const expectedEndDate = String(data.get('expectedEndDate'));
            if (expectedEndDate < expectedStartDate) throw new Error('Ngày kết thúc dự kiến phải từ ngày bắt đầu trở đi.');
            await onSave({
                title: String(data.get('title')).trim(),
                seasonName: String(data.get('seasonName')).trim(),
                seriesId: String(data.get('seriesId')) || null,
                description: String(data.get('description')).trim() || null,
                expectedStartDate,
                expectedEndDate,
                allocatedFund: Number(data.get('allocatedFund')),
            });
        });
    }}>
        <ErrorNotice error={error} />
        <div className="grid gap-4 sm:grid-cols-2">
            <label>Tên sự kiện<input className={field} name="title" defaultValue={event?.title} maxLength={255} required /></label>
            <label>Tên mùa<input className={field} name="seasonName" defaultValue={event?.seasonName} maxLength={50} required /></label>
            <label>Chuỗi sự kiện<select className={field} name="seriesId" defaultValue={selectedSeries}>
                <option value="">Sự kiện độc lập</option>
                {options.data.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select></label>
            <label>Quỹ cấp phát (VND)<input className={field} name="allocatedFund" type="number" min={0} step="0.01" defaultValue={event?.allocatedFund ?? 0} required /></label>
            <label>Ngày bắt đầu dự kiến<input className={field} name="expectedStartDate" type="date" defaultValue={event?.expectedStartDate} required /></label>
            <label>Ngày kết thúc dự kiến<input className={field} name="expectedEndDate" type="date" defaultValue={event?.expectedEndDate} required /></label>
            <label className="sm:col-span-2">Mô tả<textarea className={field} rows={3} name="description" defaultValue={event?.description ?? ''} /></label>
        </div>
        <div className="flex gap-3">
            <button className={button} disabled={busy}>Lưu sự kiện</button>
            <button className={secondary} type="button" disabled={busy} onClick={onCancel}>Hủy</button>
        </div>
    </form>;
}
