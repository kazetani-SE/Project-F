import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActiveEventContext, type RoleStatus } from './activeEventContext';
import { shellService } from '../services/shellService';
import type { EventRole, EventSummary } from '../types/models/event';
import {STORAGE_KEY_ACTIVE_EVENT} from "../constants/enum/role.ts";

export function ActiveEventProvider({ children }: { children: ReactNode }) {
    const [events, setEvents] = useState<EventSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentEventId, setCurrentEventId] = useState<string | null>(
        () => localStorage.getItem(STORAGE_KEY_ACTIVE_EVENT),
    );
    const [role, setRole] = useState<EventRole | null>(null);
    const [roleStatus, setRoleStatus] = useState<RoleStatus>('idle');

    useEffect(() => {
        let cancelled = false;
        shellService.listEvents()
            .then((list) => !cancelled && setEvents(list))
            .catch(() => !cancelled && setEvents([]))
            .finally(() => !cancelled && setIsLoading(false));
        return () => { cancelled = true; };
    }, []);

    const currentEvent = useMemo(
        () => events.find((e) => e.id === currentEventId) ?? null,
        [events, currentEventId],
    );
    const currentEventKey = currentEvent?.id ?? null;

    // fetchRole mỗi lần đổi sự kiện; kết quả cũ bị bỏ qua nếu người dùng chuyển sự kiện giữa chừng
    useEffect(() => {
        if (!currentEventKey) {
            setRole(null);
            setRoleStatus('idle');
            return;
        }
        let cancelled = false;
        setRole(null);
        setRoleStatus('checking');
        shellService.fetchRole(currentEventKey)
            .then((r) => {
                if (cancelled) return;
                setRole(r);
                setRoleStatus(r ? 'granted' : 'denied');
            })
            .catch(() => {
                if (cancelled) return;
                setRole(null);
                setRoleStatus('denied');
            });
        return () => { cancelled = true; };
    }, [currentEventKey]);

    const selectEvent = useCallback((id: string | null) => {
        setCurrentEventId(id);
        if (id) localStorage.setItem(STORAGE_KEY_ACTIVE_EVENT, id);
        else localStorage.removeItem(STORAGE_KEY_ACTIVE_EVENT);
    }, []);

    const value = useMemo(
        () => ({ events, isLoading, currentEventId, currentEvent, role, roleStatus, selectEvent }),
        [events, isLoading, currentEventId, currentEvent, role, roleStatus, selectEvent],
    );
    return <ActiveEventContext value={value}>{children}</ActiveEventContext>;
}