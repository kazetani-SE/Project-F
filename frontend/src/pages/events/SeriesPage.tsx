import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { button, link, Loading, PageHeader, Pagination, panel, RetryNotice } from '../../components/ui/CrudUi';
import { SeriesForm } from '../../components/events/SeriesForm';
import { useSuccessToast } from '../../components/ui/toastContext';
import { ROUTES } from '../../app/router/route';
import { isClubAdmin, useAuth } from '../../context/authContext';
import { useResource } from '../../hooks/useResource';
import { seriesService } from '../../services/eventService';

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
