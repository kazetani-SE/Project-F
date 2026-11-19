import { Link } from 'react-router-dom';
import { link, panel } from '../ui/CrudUi';
import EventStatusBadge from '../ui/EventStatusBadge';
import { ROUTES } from '../../app/router/route';
import type { EventResponse } from '../../types/models/event';
import { formatCurrency, formatDate } from '../../utils/formatters';

export function EventList({ events }: { events: EventResponse[] }) {
    if (!events.length) return <p>Không có sự kiện.</p>;
    return <ul className="grid gap-4 lg:grid-cols-2">{events.map((event) => <li className={`${panel} space-y-3`} key={event.id}>
        <div className="flex flex-wrap items-center justify-between gap-2">
            <Link className={link} to={ROUTES.overview(event.id)}>{event.title}</Link>
            <EventStatusBadge status={event.status} />
        </div>
        <p className="text-sm text-slate-600">{event.seasonName} · {formatDate(event.expectedStartDate)} – {formatDate(event.expectedEndDate)}</p>
        <p className="text-sm text-slate-600">Quỹ cấp phát {formatCurrency(event.allocatedFund)}</p>
        <div className="flex flex-wrap gap-4 text-sm">
            <Link className={link} to={ROUTES.documents(event.id)}>Tài liệu & Ấn phẩm</Link>
            <Link className={link} to={ROUTES.knowledge(event.id)}>Kho tri thức</Link>
        </div>
    </li>)}</ul>;
}
