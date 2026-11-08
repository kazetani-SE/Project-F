import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { button, ErrorNotice, field, link, Loading, PageHeader, Pagination, panel, secondary } from '../../components/ui/CrudUi';
import EventStatusBadge from '../../components/ui/EventStatusBadge';
import { isClubAdmin, useAuth } from '../../context/authContext';
import { useActiveEvent } from '../../context/activeEventContext';
import { useMutation } from '../../hooks/useMutation';
import { useResource } from '../../hooks/useResource';
import { eventService, seriesService } from '../../services/eventService';
import type { EventFields, EventResponse, EventSeriesResponse } from '../../types/models/event';
import { EventStatusForm } from './EventStatusForm';
import { OrganizerSection } from './OrganizerSection';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const dateLabel = (date: string | null) => date?.split('-').reverse().join('/') ?? '—';

export function EventList({ events }: { events: EventResponse[] }) {
    if (!events.length) return <p>Không có sự kiện.</p>;
    return <ul className="grid gap-4 lg:grid-cols-2">{events.map((event) => <li className={`${panel} space-y-3`} key={event.id}>
        <div className="flex flex-wrap items-center justify-between gap-2">
            <Link className={link} to={`/events/${event.id}/overview`}>{event.title}</Link>
            <EventStatusBadge status={event.status} />
        </div>
        <p className="text-sm text-slate-600">{event.seasonName} · {dateLabel(event.expectedStartDate)} – {dateLabel(event.expectedEndDate)}</p>
        <p className="text-sm text-slate-600">Quỹ cấp phát {currency.format(event.allocatedFund)}</p>
        <div className="flex flex-wrap gap-4 text-sm">
            <Link className={link} to={`/events/${event.id}/documents`}>Tài liệu & Ấn phẩm</Link>
            <Link className={link} to={`/events/${event.id}/knowledge`}>Kho tri thức</Link>
        </div>
    </li>)}</ul>;
}

export function EventsPage() {
    const { user } = useAuth();
    const [page, setPage] = useState(0);
    const resource = useResource(useCallback(() => eventService.list({ page, size: 20 }), [page]));
    return <section className="space-y-5">
        <PageHeader title="Sự kiện" action={isClubAdmin(user?.clubRole) && <Link className={button} to="/events/new">Tạo sự kiện</Link>} />
        {resource.isLoading && <Loading />}
        <ErrorNotice error={resource.error} />
        {resource.data && <>
            <EventList events={resource.data.content} />
            <Pagination page={page} totalPages={resource.data.totalPages} onChange={setPage} />
        </>}
    </section>;
}

async function loadSeriesOptions() {
    const series: EventSeriesResponse[] = [];
    const size = 100;
    let page = 0;
    let totalPages = 1;
    do {
        const response = await seriesService.list({ page, size });
        series.push(...response.content);
        totalPages = response.totalPages;
        page += 1;
    } while (page < totalPages);
    return series;
}

function EventForm({ event, seriesId, onSave, onCancel }: {
    event?: EventResponse; seriesId?: string; onSave: (data: EventFields) => Promise<void>; onCancel: () => void;
}) {
    const options = useResource(loadSeriesOptions);
    const { busy, error, mutate } = useMutation();
    const selectedSeries = event?.seriesId ?? seriesId ?? '';
    if (options.isLoading) return <Loading />;
    if (!options.data) return <div className="space-y-3"><ErrorNotice error={options.error} />
        <button className={secondary} onClick={options.reload}>Thử lại</button>
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

export function NewEventPage() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    return <section className="space-y-5">
        <PageHeader title="Tạo sự kiện" />
        <EventForm seriesId={params.get('seriesId') ?? undefined} onCancel={() => navigate('/events')} onSave={async (data) => {
            const event = await eventService.create(data);
            navigate(`/events/${event.id}/overview`);
        }} />
    </section>;
}

export function EventOverviewPage() {
    const { eventId = '' } = useParams();
    const { currentEvent, replaceEvent } = useActiveEvent();
    if (currentEvent?.id !== eventId) return <Loading />;
    return <EventOverview key={eventId} event={currentEvent} onSaved={replaceEvent} />;
}

function EventOverview({ event, onSaved }: { event: EventResponse; onSaved: (event: EventResponse) => void }) {
    const { user } = useAuth();
    const [editing, setEditing] = useState(false);
    const admin = isClubAdmin(user?.clubRole);
    const facts = [
        ['Mùa', event.seasonName],
        ['Quỹ cấp phát', currency.format(event.allocatedFund)],
        ['Ngày dự kiến', `${dateLabel(event.expectedStartDate)} – ${dateLabel(event.expectedEndDate)}`],
        ['Ngày thực tế', `${dateLabel(event.actualStartDate)} – ${dateLabel(event.actualEndDate)}`],
        ['Mô tả', event.description],
    ];

    return <section className="space-y-5">
        <Link className={link} to="/events">Danh sách sự kiện</Link>
        <PageHeader title={event.title} action={admin && !editing && <button className={button} onClick={() => setEditing(true)}>Chỉnh sửa</button>} />
        <EventStatusBadge status={event.status} />
        {editing && admin ? <EventForm event={event} onCancel={() => setEditing(false)} onSave={async (data) => {
            onSaved(await eventService.update(event.id, data));
            setEditing(false);
        }} /> : <dl className={`${panel} grid gap-4 sm:grid-cols-2`}>
            {facts.map(([label, value]) => <div key={label}><dt className="text-sm text-slate-500">{label}</dt><dd className="whitespace-pre-line">{value ?? '—'}</dd></div>)}
            {event.seriesId && <div><dt className="text-sm text-slate-500">Chuỗi sự kiện</dt>
                <dd><Link className={link} to={`/series/${event.seriesId}`}>Xem chuỗi sự kiện</Link></dd></div>}
        </dl>}
        {admin && !editing && <EventStatusForm key={event.status} event={event} onSaved={onSaved} />}
        <OrganizerSection eventId={event.id} admin={admin} />
    </section>;
}
