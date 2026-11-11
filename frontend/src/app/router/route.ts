export const ROUTE_PATHS = {
    ROOT: '/',
    EVENTS: '/events',
    EVENT_DOCUMENTS: '/events/:eventId/documents',
    EVENT_KNOWLEDGE: '/events/:eventId/knowledge',
    OVERVIEW: 'overview',
    FINANCE_DASHBOARD: 'finance/dashboard',
    FINANCE_BUDGETS: '/events/:eventId/finance/budgets',
    FINANCE_EXPENSES: '/events/:eventId/finance/expenses',
    FINANCE_BENCHMARKS: '/events/:eventId/finance/benchmarks',
    PLAYGROUND: 'playground',
    ALL: '*',
} as const;

export const ROUTES = {
    documents: (eventId: string) => `/events/${eventId}/documents`,
    knowledge: (eventId: string) => `/events/${eventId}/knowledge`,

    budgets: (eventId: string) => `/events/${eventId}/finance/budgets`,
    expenses: (eventId: string) => `/events/${eventId}/finance/expenses`,
    benchmarks: (eventId: string) => `/events/${eventId}/finance/benchmarks`,
} as const;
