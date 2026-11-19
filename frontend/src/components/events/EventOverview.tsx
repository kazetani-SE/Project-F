import { useState } from 'react';
import { Link } from 'react-router-dom';
import { button, link, PageHeader, panel } from '../ui/CrudUi';
import EventStatusBadge from '../ui/EventStatusBadge';
import { EventForm } from './EventForm';
import { EventStatusForm } from './EventStatusForm';
import { OrganizerSection } from '../organizers/OrganizerSection';
import { useSuccessToast } from '../ui/toastContext';
import { ROUTE_PATHS, ROUTES } from '../../app/router/route';
import { isClubAdmin, useAuth } from '../../context/authContext';
import { useActiveEvent } from '../../context/activeEventContext';
import { eventService } from '../../services/eventService';
import type { EventResponse } from '../../types/models/event';
import { formatCurrency, formatDate } from '../../utils/formatters';

export function EventOverview({ event, onSaved }: { event: EventResponse; onSaved: (event: EventResponse) => void }) {
    const { user } = useAuth();
    const { currentEventId, role, roleStatus } = useActiveEvent();
    const [editing, setEditing] = useState(false);
    const admin = isClubAdmin(user?.clubRole);
    const canEditEvent = admin || (currentEventId === event.id && roleStatus === 'granted' && role === 'LEAD_HEADER');
    const notify = useSuccessToast();
    const facts = [
        ['Mùa', event.seasonName],
        ['Quỹ cấp phát', formatCurrency(event.allocatedFund)],
        ['Ngày dự kiến', `${formatDate(event.expectedStartDate)} – ${formatDate(event.expectedEndDate)}`],
        ['Ngày thực tế', `${formatDate(event.actualStartDate)} – ${formatDate(event.actualEndDate)}`],
        ['Mô tả', event.description],
    ];

    return <section className="space-y-5">
        <Link className={link} to={ROUTE_PATHS.EVENTS}>Danh sách sự kiện</Link>
        <PageHeader title={event.title} action={canEditEvent && !editing && <button className={button} onClick={() => setEditing(true)}>Chỉnh sửa</button>} />
        <EventStatusBadge status={event.status} />
        {editing && canEditEvent ? <EventForm event={event} onCancel={() => setEditing(false)} onSave={async (data) => {
            onSaved(await eventService.update(event.id, data));
            notify('Đã cập nhật sự kiện.');
            setEditing(false);
        }} /> : <dl className={`${panel} grid gap-4 sm:grid-cols-2`}>
            {facts.map(([label, value]) => <div key={label}><dt className="text-sm text-slate-500">{label}</dt><dd className="whitespace-pre-line">{value ?? '—'}</dd></div>)}
            {event.seriesId && <div><dt className="text-sm text-slate-500">Chuỗi sự kiện</dt>
                <dd><Link className={link} to={ROUTES.series(event.seriesId)}>Xem chuỗi sự kiện</Link></dd></div>}
        </dl>}
        {canEditEvent && !editing && <EventStatusForm key={event.status} event={event} onSaved={onSaved} />}
        {(admin || (currentEventId === event.id && roleStatus === 'granted'))
            && <OrganizerSection eventId={event.id} admin={admin} />}
    </section>;
}
