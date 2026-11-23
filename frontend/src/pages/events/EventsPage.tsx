import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { button, field, Loading, PageHeader, Pagination, panel, RetryNotice } from '../../components/ui/CrudUi';
import { EventList } from './components/EventList';
import { ROUTE_PATHS } from '../../app/router/route';
import { EVENT_STATUS_LABEL } from '../../constants/enum/event';
import { isClubAdmin, useAuth } from '../../context/authContext';
import { useResource } from '../../hooks/useResource';
import { eventService, seriesService } from '../../services/eventService';
import { loadPages } from '../../services/loadPages';
import type { EventStatus } from '../../types/models/event';

export function EventsPage() {
    const { user } = useAuth();
    const [page, setPage] = useState(0);
    const [seriesId, setSeriesId] = useState('');
    const [status, setStatus] = useState<EventStatus | ''>('');
    const options = useResource(loadSeriesOptions);
    const resource = useResource(useCallback(() => eventService.list({
        page, size: 20, seriesId: seriesId || undefined, status: status || undefined,
    }), [page, seriesId, status]));
    return <section className="space-y-5">
        <PageHeader title="Sự kiện" action={isClubAdmin(user?.clubRole) && <Link className={button} to={ROUTE_PATHS.EVENT_NEW}>Tạo sự kiện</Link>} />
        <div className={`${panel} grid gap-3 sm:grid-cols-2`}>
            <label>Chuỗi sự kiện<select className={field} value={seriesId} disabled={options.isLoading || Boolean(options.error)}
                onChange={(input) => { setSeriesId(input.target.value); setPage(0); }}>
                <option value="">{options.isLoading ? 'Đang tải chuỗi…' : 'Tất cả chuỗi'}</option>
                {options.data?.map((series) => <option key={series.id} value={series.id}>{series.name}</option>)}
            </select></label>
            <label>Trạng thái<select className={field} value={status} onChange={(input) => {
                setStatus(input.target.value as EventStatus | '');
                setPage(0);
            }}>
                <option value="">Tất cả trạng thái</option>
                {Object.entries(EVENT_STATUS_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select></label>
            <RetryNotice error={options.error} onRetry={options.reload} />
        </div>
        {resource.isLoading && <Loading />}
        <RetryNotice error={resource.error} onRetry={resource.reload} />
        {resource.data && <>
            <EventList events={resource.data.items} />
            <Pagination pageData={resource.data} onChange={setPage} />
        </>}
    </section>;
}

const loadSeriesOptions = () => loadPages(seriesService.list);
