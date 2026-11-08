import { http, HttpResponse } from 'msw';
import { MOCK_EVENTS, MOCK_ROLES, MOCK_SERIES_ID, MOCK_USER } from './data';
import type { CreateMemberRequest, MemberFields, MemberResponse } from '../types/models/member';
import type { EventFields, EventResponse, EventSeriesResponse, EventStatusRequest, OrganizerFields, OrganizerResponse, SeriesFields } from '../types/models/event';

const base = '/api/v1';
const ok = <T,>(data: T) => HttpResponse.json({ success: true, data });
const missing = () => HttpResponse.json({ success: false, message: 'Không tìm thấy dữ liệu.' }, { status: 404 });
const now = () => new Date().toISOString();
const members: MemberResponse[] = [
    { ...MOCK_USER, studentId: 'SE000001', phone: null, department: 'PLAN', batch: 'K21', active: true, createdAt: now(), inactiveAt: null },
    { id: '11111111-1111-4111-8111-111111111102', fullName: 'Trần Bình', email: 'binh.tran@fcode.local', clubRole: 'MEMBER',
        studentId: 'SE000002', phone: null, department: 'MEDIA', batch: 'K22', active: true, createdAt: now(), inactiveAt: null },
];
const events = [...MOCK_EVENTS];
const series: EventSeriesResponse[] = [
    { id: MOCK_SERIES_ID, name: 'F-Code Tech', description: 'Chuỗi sự kiện công nghệ của CLB.', createdAt: now() },
];
let organizers: OrganizerResponse[] = events.flatMap(({ id }) => MOCK_ROLES[id] ? [{
    id: crypto.randomUUID(), eventId: id, memberId: MOCK_USER.id, memberName: MOCK_USER.fullName,
    role: MOCK_ROLES[id], assignedTasks: null, joinedAt: now(),
}] : []);

function paginate<T>(items: T[], request: Request) {
    const query = new URL(request.url).searchParams;
    const page = Number(query.get('page') ?? 0);
    const size = Number(query.get('size') ?? 20);
    return ok({ content: items.slice(page * size, (page + 1) * size), page, size, totalElements: items.length, totalPages: Math.ceil(items.length / size) });
}

export const managementHandlers = [
    http.get(`${base}/auth/me`, () => ok(MOCK_USER)),
    http.get(`${base}/members`, ({ request }) => {
        const query = new URL(request.url).searchParams;
        const keyword = query.get('keyword')?.toLowerCase();
        const [sort, order] = (query.get('sort') ?? 'fullName,asc').split(',');
        const filtered = members.filter((member) => {
            if (keyword && ![member.fullName, member.email, member.studentId].some((value) => value.toLowerCase().includes(keyword))) return false;
            if (query.has('department') && query.get('department') !== member.department) return false;
            if (query.has('role') && query.get('role') !== member.clubRole) return false;
            if (query.has('batch') && query.get('batch') !== member.batch) return false;
            return !query.has('isActive') || query.get('isActive') === String(member.active);
        });
        const key = sort === 'createdAt' ? sort : 'fullName';
        filtered.sort((a, b) => (order === 'desc' ? -1 : 1) * a[key].localeCompare(b[key], 'vi'));
        return paginate(filtered, request);
    }),
    http.get(`${base}/members/:id`, ({ params }) => {
        const member = members.find((item) => item.id === params.id);
        return member ? ok(member) : missing();
    }),
    http.post(`${base}/members`, async ({ request }) => {
        const input = await request.json() as CreateMemberRequest;
        const member = { ...input, id: crypto.randomUUID(), active: true, createdAt: now(), inactiveAt: null };
        members.push(member);
        return ok(member);
    }),
    http.put(`${base}/members/:id`, async ({ params, request }) => {
        const member = members.find((item) => item.id === params.id);
        return member ? ok(Object.assign(member, await request.json() as MemberFields)) : missing();
    }),
    http.patch(`${base}/members/:id/status`, async ({ params, request }) => {
        const member = members.find((item) => item.id === params.id);
        if (!member) return missing();
        const { isActive } = await request.json() as { isActive: boolean };
        return ok(Object.assign(member, { active: isActive, inactiveAt: isActive ? null : now() }));
    }),
    http.get(`${base}/event-series`, ({ request }) => paginate(series, request)),
    http.get(`${base}/event-series/:id`, ({ params }) => {
        const item = series.find((entry) => entry.id === params.id);
        return item ? ok({ ...item, events: events.filter((event) => event.seriesId === item.id) }) : missing();
    }),
    http.post(`${base}/event-series`, async ({ request }) => {
        const input = await request.json() as SeriesFields;
        const item = { ...input, id: crypto.randomUUID(), createdAt: now() };
        series.push(item);
        return ok(item);
    }),
    http.put(`${base}/event-series/:id`, async ({ params, request }) => {
        const item = series.find((entry) => entry.id === params.id);
        return item ? ok(Object.assign(item, await request.json() as SeriesFields)) : missing();
    }),
    http.get(`${base}/events`, ({ request }) => paginate(events, request)),
    http.get(`${base}/events/:eventId`, ({ params }) => {
        const event = events.find((item) => item.id === params.eventId);
        return event ? ok(event) : missing();
    }),
    http.post(`${base}/events`, async ({ request }) => {
        const input = await request.json() as EventFields;
        const event: EventResponse = { ...input, id: crypto.randomUUID(), status: 'PLANNING',
            actualStartDate: null, actualEndDate: null, createdAt: now(), updatedAt: now() };
        events.push(event);
        return ok(event);
    }),
    http.put(`${base}/events/:eventId`, async ({ params, request }) => {
        const event = events.find((item) => item.id === params.eventId);
        return event ? ok(Object.assign(event, await request.json() as EventFields, { updatedAt: now() })) : missing();
    }),
    http.patch(`${base}/events/:eventId/status`, async ({ params, request }) => {
        const event = events.find((item) => item.id === params.eventId);
        return event ? ok(Object.assign(event, await request.json() as EventStatusRequest, { updatedAt: now() })) : missing();
    }),
    http.get(`${base}/events/:eventId/my-role`, ({ params }) =>
        ok({ role: organizers.find((item) => item.eventId === params.eventId && item.memberId === MOCK_USER.id)?.role ?? null })),
    http.get(`${base}/events/:eventId/organizers`, ({ params }) =>
        ok(organizers.filter((item) => item.eventId === params.eventId))),
    http.post(`${base}/events/:eventId/organizers`, async ({ params, request }) => {
        const input = await request.json() as OrganizerFields;
        const member = members.find((item) => item.id === input.memberId);
        if (!member) return missing();
        const item = { ...input, id: crypto.randomUUID(), eventId: String(params.eventId), memberName: member.fullName, joinedAt: now() };
        organizers.push(item);
        return ok(item);
    }),
    http.delete(`${base}/events/:eventId/organizers/:memberId`, ({ params }) => {
        organizers = organizers.filter((item) => item.eventId !== params.eventId || item.memberId !== params.memberId);
        return new HttpResponse(null, { status: 204 });
    }),
];
