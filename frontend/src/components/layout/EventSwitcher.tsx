import { useNavigate } from 'react-router-dom';
import { ROUTE_PATHS, ROUTES } from '../../app/router/route';
import { useActiveEvent } from '../../context/activeEventContext';

export default function EventSwitcher() {
    const { events, isLoading, currentEvent, selectEvent } = useActiveEvent();
    const navigate = useNavigate();

    return <select aria-label="Chuyển mùa sự kiện"
        className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-700 sm:w-36 lg:w-48"
        value={currentEvent?.id ?? ''} disabled={isLoading}
        onChange={(event) => {
            const id = event.target.value;
            selectEvent(id || null);
            navigate(id ? ROUTES.overview(id) : ROUTE_PATHS.EVENTS);
        }}>
        <option value="">{isLoading ? 'Đang tải mùa…' : 'Chọn mùa sự kiện'}</option>
        {events.map((event) => <option key={event.id} value={event.id}>
            {event.name}{event.seasonLabel ? ` · ${event.seasonLabel}` : ''}
        </option>)}
    </select>;
}
