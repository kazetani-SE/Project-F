import { useCallback, useEffect, useState, type ReactNode } from 'react';
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
    const currentEvent = events.data?.find((event) => event.id === currentEventId) ?? null;
    const lookup = useResource(useCallback(() => currentEvent
        ? shellService.fetchRole(currentEvent.id) : Promise.resolve(null), [currentEvent]));

    const selectEvent = useCallback((id: string | null) => {
        setCurrentEventId(id);
        if (id) localStorage.setItem(STORAGE_KEY_ACTIVE_EVENT, id);
        else localStorage.removeItem(STORAGE_KEY_ACTIVE_EVENT);
    }, []);

    useEffect(() => {
        // Chỉ kiểm tra vai trò sau khi xác nhận sự kiện còn tồn tại trong danh sách vừa tải.
        if (events.data && currentEventId && !currentEvent) selectEvent(null);
    }, [events.data, currentEventId, currentEvent, selectEvent]);

    // Nhãn trách nhiệm xác nhận phân công nhưng không cấp quyền của vai trò LEAD.
    const role = lookup.data && Object.hasOwn(EVENT_ROLE_LABEL, lookup.data) ? lookup.data as EventRole : null;
    let roleStatus: RoleStatus = 'idle';
    if (currentEventId) {
        if (events.isLoading || lookup.isLoading) roleStatus = 'checking';
        else if (!currentEvent || lookup.error) roleStatus = 'denied';
        else roleStatus = lookup.data || isClubAdmin(user?.clubRole) ? 'granted' : 'denied';
    }

    return <ActiveEventContext value={{
        events: events.data ?? [], isLoading: events.isLoading,
        currentEventId, currentEvent,
        role, roleStatus, error: lookup.error, selectEvent, refreshEvents: events.reload, retry: lookup.reload,
    }}>{children}</ActiveEventContext>;
}
