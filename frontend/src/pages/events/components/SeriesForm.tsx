import { button, ErrorNotice, field, panel, secondary } from '../../../components/ui/CrudUi';
import { useMutation } from '../../../hooks/useMutation';
import type { SeriesFields } from '../../../types/models/event';

export function SeriesForm({ series, onSave, onCancel }: {
    series?: SeriesFields; onSave: (data: SeriesFields) => Promise<void>; onCancel: () => void;
}) {
    const { busy, error, mutate } = useMutation();
    return <form className={`${panel} space-y-4`} onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        void mutate(() => onSave({
            name: String(data.get('name')).trim(),
            description: String(data.get('description')).trim() || null,
        }));
    }}>
        <ErrorNotice error={error} />
        <label className="block">Tên chuỗi<input className={field} name="name" defaultValue={series?.name} maxLength={200} required /></label>
        <label className="block">Mô tả<textarea className={field} name="description" defaultValue={series?.description ?? ''} rows={3} /></label>
        <div className="flex gap-3">
            <button className={button} disabled={busy}>Lưu chuỗi sự kiện</button>
            <button className={secondary} type="button" disabled={busy} onClick={onCancel}>Hủy</button>
        </div>
    </form>;
}
