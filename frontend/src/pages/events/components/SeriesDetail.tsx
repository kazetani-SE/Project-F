import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { button, link, Loading, PageHeader, panel, RetryNotice, secondary } from '../../../components/ui/CrudUi';
import { EventList } from './EventList';
import { SeriesForm } from './SeriesForm';
import { useSuccessToast } from '../../../components/ui/toastContext';
import { ROUTE_PATHS } from '../../../app/router/route';
import { isClubAdmin, useAuth } from '../../../context/authContext';
import { useResource } from '../../../hooks/useResource';
import { seriesService } from '../../../services/eventService';

export function SeriesDetail({ id }: { id: string }) {
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
