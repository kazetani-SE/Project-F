import { useCallback, useState, type ReactNode } from 'react';
import { ActiveEventContext, type RoleStatus } from './activeEventContext';
import { isClubAdmin, useAuth } from './authContext';
import { useResource } from '../hooks/useResource';
import { shellService } from '../services/shellService';
import { EVENT_ROLE_LABEL, STORAGE_KEY_ACTIVE_EVENT } from '../constants/enum/role';
import type { EventRole } from '../types/models/event';

export function ActiveEventProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [currentEventId, setCurrentEventId] = useState(() => localStorage.getItem(STORAGE_KEY_ACTIVE_EVENT));
    const events = useResource(shellService.listEvents);
    const lookup = useResource(useCallback(() => currentEventId
        ? shellService.fetchRole(currentEventId) : Promise.resolve(null), [currentEventId]));

    const selectEvent = useCallback((id: string | null) => {
        setCurrentEventId(id);
        if (id) localStorage.setItem(STORAGE_KEY_ACTIVE_EVENT, id);
        else localStorage.removeItem(STORAGE_KEY_ACTIVE_EVENT);
    }, []);

    // Nhãn trách nhiệm xác nhận phân công nhưng không cấp quyền của vai trò LEAD.
    const role = lookup.data && Object.hasOwn(EVENT_ROLE_LABEL, lookup.data) ? lookup.data as EventRole : null;
    let roleStatus: RoleStatus = 'idle';
    if (currentEventId) {
        if (lookup.isLoading) roleStatus = 'checking';
        else if (lookup.error) roleStatus = 'denied';
        else roleStatus = lookup.data || isClubAdmin(user?.clubRole) ? 'granted' : 'denied';
    }

    return <ActiveEventContext value={{
        events: events.data ?? [], isLoading: events.isLoading,
        currentEventId, currentEvent: events.data?.find((event) => event.id === currentEventId) ?? null,
        role, roleStatus, error: lookup.error, selectEvent, refreshEvents: events.reload, retry: lookup.reload,
    }}>{children}</ActiveEventContext>;
}
