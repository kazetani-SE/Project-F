import { createContext, useContext } from 'react';
import type { ApiError } from '../types/common/api';
import type { EventRole, EventResponse } from '../types/models/event';

export type RoleStatus = 'idle' | 'checking' | 'granted' | 'denied' | 'error';

export interface ActiveEventState {
    currentEventId: string | null;
    currentEvent: EventResponse | null;
    role: EventRole | null;
    roleStatus: RoleStatus;
    error?: ApiError;
    selectEvent: (id: string | null) => void;
    replaceEvent: (event: EventResponse) => void;
    retry: () => void;
}

export const ActiveEventContext = createContext<ActiveEventState | null>(null);

export function useActiveEvent() {
    const ctx = useContext(ActiveEventContext);
    if (!ctx) throw new Error('useActiveEvent must be used within ActiveEventProvider');
    return ctx;
}
