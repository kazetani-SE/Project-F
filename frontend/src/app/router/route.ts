export const ROUTE_PATHS = {
    ROOT: '/',
    EVENTS: '/events',
    EVENT_DOCUMENTS: '/events/:eventId/documents',
    EVENT_KNOWLEDGE: '/events/:eventId/knowledge',
    ALL: '*',
} as const;

export const ROUTES = {
    documents: (eventId: string) => `/events/${eventId}/documents`,
    knowledge: (eventId: string) => `/events/${eventId}/knowledge`,
} as const;
