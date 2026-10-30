import { Link, useLocation } from 'react-router-dom';
import {useAuth} from "../../context/authContext.ts";
import {useActiveEvent} from "../../context/activeEventContext.ts";
import EventStatusBadge from "../../components/ui/EventStatusBadge.tsx";

export default function PlaygroundPage() {
    const { pathname } = useLocation();
    const { user } = useAuth();
    const { events, isLoading, currentEvent, role, roleStatus } = useActiveEvent();

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold text-title">Shell playground</h1>

            <div className="rounded-xl border border-gray-100 bg-white p-5 text-sm shadow-md">
                <p>Path: <code className="font-mono text-xs">{pathname}</code></p>
                <p>User: {user?.fullName} ({user?.clubRole})</p>
                <p>Event: {currentEvent?.name ?? '—'} · roleStatus: {roleStatus} · role: {role ?? '—'}</p>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-md">
                {isLoading && <div className="m-4 h-24 animate-pulse rounded-lg bg-gray-100" />}
                {events.map((ev) => (
                    <div key={ev.id} className="flex items-center justify-between border-b border-gray-100 px-5 py-3 last:border-0">
                        <div>
                            <p className="font-medium text-title">{ev.name}</p>
                            <p className="text-xs text-muted">{ev.seasonLabel ?? 'Sự kiện đơn'}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <EventStatusBadge status={ev.status} />
                            <Link to={`/events/${ev.id}/overview`} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover">
                                Mở
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}