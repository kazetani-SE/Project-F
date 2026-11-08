import { useCallback, useEffect, type ReactNode } from 'react';
import { useMatch } from 'react-router-dom';
import { ActiveEventContext, type RoleStatus } from './activeEventContext';
import { isClubAdmin, useAuth } from './authContext';
import { useResource } from '../hooks/useResource';
import { eventService } from '../services/eventService';
import { STORAGE_KEY_ACTIVE_EVENT } from '../constants/enum/role';
import type { EventResponse } from '../types/models/event';

export function ActiveEventProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const match = useMatch('/events/:eventId/*');
    const routeId = match?.params.eventId;
    const eventId = routeId === 'new' ? undefined : routeId;
    const currentEventId = eventId ?? localStorage.getItem(STORAGE_KEY_ACTIVE_EVENT);
    const resource = useResource(useCallback(async () => {
        if (!currentEventId) return null;
        const [event, role] = await Promise.all([eventService.get(currentEventId), eventService.myRole(currentEventId)]);
        return { event, role };
    }, [currentEventId]));

    const selectEvent = useCallback((id: string | null) => {
        if (id) localStorage.setItem(STORAGE_KEY_ACTIVE_EVENT, id);
        else localStorage.removeItem(STORAGE_KEY_ACTIVE_EVENT);
    }, []);

    useEffect(() => {
        if (eventId) selectEvent(eventId);
    }, [eventId, selectEvent]);

    const role = resource.data?.role ?? null;
    let roleStatus: RoleStatus = 'idle';
    if (currentEventId) {
        if (resource.isLoading) roleStatus = 'checking';
        else if (resource.error) roleStatus = resource.error.status === 403 ? 'denied' : 'error';
        else roleStatus = role || isClubAdmin(user?.clubRole) ? 'granted' : 'denied';
    }

    function replaceEvent(event: EventResponse) {
        if (event.id === currentEventId) resource.replace({ event, role });
    }

    return <ActiveEventContext value={{
        currentEventId, currentEvent: resource.data?.event ?? null,
        role, roleStatus, error: resource.error, selectEvent, replaceEvent, retry: resource.reload,
    }}>{children}</ActiveEventContext>;
}
