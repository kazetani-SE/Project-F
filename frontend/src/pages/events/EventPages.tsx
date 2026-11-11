import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { button, ErrorNotice, field, link, Loading, PageHeader, Pagination, panel, RetryNotice, secondary } from '../../components/ui/CrudUi';
import EventStatusBadge from '../../components/ui/EventStatusBadge';
import { useSuccessToast } from '../../components/ui/toastContext';
import { ROUTE_PATHS, ROUTES } from '../../app/router/route';
import { EVENT_STATUS_LABEL } from '../../constants/enum/event';
import { isClubAdmin, useAuth } from '../../context/authContext';
import { useActiveEvent } from '../../context/activeEventContext';
import { useMutation } from '../../hooks/useMutation';
import { useResource } from '../../hooks/useResource';
import { eventService, seriesService } from '../../services/eventService';
import { loadPages } from '../../services/loadPages';
import type { EventFields, EventResponse, EventStatus } from '../../types/models/event';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { EventStatusForm } from './EventStatusForm';
import { OrganizerSection } from '../organizers/OrganizerSection';

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

function EventForm({ event, seriesId, onSave, onCancel }: {
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

export function NewEventPage() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const { refreshEvents } = useActiveEvent();
    const notify = useSuccessToast();
    return <section className="space-y-5">
        <PageHeader title="Tạo sự kiện" />
        <EventForm seriesId={params.get('seriesId') ?? undefined} onCancel={() => navigate(ROUTE_PATHS.EVENTS)} onSave={async (data) => {
            const event = await eventService.create(data);
            refreshEvents?.();
            notify('Đã tạo sự kiện.');
            navigate(ROUTES.overview(event.id));
        }} />
    </section>;
}

export function EventOverviewPage() {
    const { eventId = '' } = useParams();
    const { refreshEvents } = useActiveEvent();
    const resource = useResource(useCallback(() => eventService.get(eventId), [eventId]));
    if (resource.isLoading) return <Loading />;
    if (!resource.data) return <RetryNotice error={resource.error} onRetry={resource.reload} />;
    return <EventOverview key={eventId} event={resource.data} onSaved={(event) => {
        resource.replace(event);
        refreshEvents?.();
    }} />;
}

function EventOverview({ event, onSaved }: { event: EventResponse; onSaved: (event: EventResponse) => void }) {
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
