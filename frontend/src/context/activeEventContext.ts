import { createContext, useContext } from 'react';
import type {EventRole, EventSummary} from "../types/models/event.ts";

export type RoleStatus = 'idle' | 'checking' | 'granted' | 'denied';

export interface ActiveEventState {
    events: EventSummary[];
    isLoading: boolean;
    currentEventId: string | null;
    currentEvent: EventSummary | null;
    role: EventRole | null;
    roleStatus: RoleStatus;
    selectEvent: (id: string | null) => void;
}
export const ActiveEventContext = createContext<ActiveEventState | null>(null);

export function useActiveEvent() {
    const ctx = useContext(ActiveEventContext);
    if (!ctx) throw new Error('useActiveEvent must be used within ActiveEventProvider');
    return ctx;
}