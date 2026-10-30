import { delay, http, HttpResponse } from 'msw';
import { MOCK_EVENTS, MOCK_ROLES, MOCK_USER } from './data';

const BASE = '/api/v1';
const ok = <T,>(data: T) => HttpResponse.json({ success: true, data });

export const handlers = [
    http.get(`${BASE}/auth/me`, async () => {
        await delay(200);
        return ok(MOCK_USER);
    }),
    http.get(`${BASE}/events`, async () => {
        await delay(300);
        return ok(MOCK_EVENTS);
    }),
    // fetchRole(eventId): 600ms như tài liệu UI
    http.get(`${BASE}/events/:eventId/my-role`, async ({ params }) => {
        await delay(600);
        return ok({ role: MOCK_ROLES[params.eventId as string] ?? null });
    }),
];