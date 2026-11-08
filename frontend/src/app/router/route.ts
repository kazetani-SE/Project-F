export const ROUTE_PATHS = {
    ROOT: '/',
    EVENTS: '/events',
    EVENT_DOCUMENTS: '/events/:eventId/documents',
    EVENT_KNOWLEDGE: '/events/:eventId/knowledge',
    OVERVIEW: 'overview',
    FINANCE_DASHBOARD: 'finance/dashboard',
    FINANCE_BUDGETS: 'finance/budgets',
    FINANCE_EXPENSES: 'finance/expenses',
    FINANCE_BENCHMARKS: 'finance/benchmarks',
    PLAYGROUND: 'playground',
    ALL: '*',
} as const;

export const ROUTES = {
    documents: (eventId: string) => `/events/${eventId}/documents`,
    knowledge: (eventId: string) => `/events/${eventId}/knowledge`,
} as const;
