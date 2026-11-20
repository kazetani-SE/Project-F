import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { button, ErrorNotice, field, link, Loading, PageHeader, Pagination, panel, RetryNotice, secondary } from '../../components/ui/CrudUi';
import { useSuccessToast } from '../../components/ui/toastContext';
import { ROUTE_PATHS, ROUTES } from '../../app/router/route';
import { isClubAdmin, useAuth } from '../../context/authContext';
import { useMutation } from '../../hooks/useMutation';
import { useResource } from '../../hooks/useResource';
import { seriesService } from '../../services/eventService';
import type { SeriesFields } from '../../types/models/event';
import { EventList } from './EventPages';

function SeriesForm({ series, onSave, onCancel }: {
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

export function SeriesPage() {
    const { user } = useAuth();
    const admin = isClubAdmin(user?.clubRole);
    const navigate = useNavigate();
    const [page, setPage] = useState(0);
    const [creating, setCreating] = useState(false);
    const notify = useSuccessToast();
    const resource = useResource(useCallback(() => seriesService.list({ page, size: 20 }), [page]));
    return <section className="space-y-5">
        <PageHeader title="Chuỗi sự kiện" action={admin && !creating && <button className={button} onClick={() => setCreating(true)}>Tạo chuỗi sự kiện</button>} />
        {admin && creating && <SeriesForm onCancel={() => setCreating(false)} onSave={async (data) => {
            const series = await seriesService.create(data);
            notify('Đã tạo chuỗi sự kiện.');
            navigate(ROUTES.series(series.id));
        }} />}
        {resource.isLoading && <Loading />}
        <RetryNotice error={resource.error} onRetry={resource.reload} />
        {resource.data && (resource.data.items.length ? <ul className="grid gap-4 lg:grid-cols-2">
            {resource.data.items.map((series) => <li key={series.id} className={panel}>
                <Link className={link} to={ROUTES.series(series.id)}>{series.name}</Link>
                {series.description && <p className="mt-2 line-clamp-3 text-sm text-slate-600">{series.description}</p>}
            </li>)}
        </ul> : <p>Chưa có chuỗi sự kiện.</p>)}
        {resource.data && <Pagination pageData={resource.data} onChange={setPage} />}
    </section>;
}

export function SeriesDetailPage() {
    const { id = '' } = useParams();
    return <SeriesDetail key={id} id={id} />;
}

function SeriesDetail({ id }: { id: string }) {
    const { user } = useAuth();
    const admin = isClubAdmin(user?.clubRole);
    const [editing, setEditing] = useState(false);
    const notify = useSuccessToast();
    const resource = useResource(useCallback(() => seriesService.get(id), [id]));
    if (resource.isLoading) return <Loading />;
    if (!resource.data) return <RetryNotice error={resource.error} onRetry={resource.reload} />;
    const series = resource.data;

    return <section className="space-y-5">
        <Link className={link} to={ROUTE_PATHS.SERIES}>Danh sách chuỗi sự kiện</Link>
        <PageHeader title={series.name} action={admin && !editing && <button className={button} onClick={() => setEditing(true)}>Chỉnh sửa</button>} />
        {admin && editing ? <SeriesForm series={series} onCancel={() => setEditing(false)} onSave={async (data) => {
            const updated = await seriesService.update(id, data);
            resource.replace({ ...series, ...updated });
            setEditing(false);
            notify('Đã cập nhật chuỗi sự kiện.');
        }} /> : series.description && <p className={`${panel} whitespace-pre-line`}>{series.description}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Các mùa sự kiện</h2>
            {admin && <Link className={secondary} to={`${ROUTE_PATHS.EVENT_NEW}?seriesId=${encodeURIComponent(id)}`}>Thêm mùa sự kiện</Link>}
        </div>
        <EventList events={series.events} />
    </section>;
}
