import { useEffect, useState } from 'react';
import { Outlet, useLocation, useMatch } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import {useActiveEvent} from "../../context/activeEventContext.ts";
import {AuthProvider} from "../../context/AuthProvider.tsx";
import {ActiveEventProvider} from "../../context/ActiveEventProvider.tsx";

// Vào thẳng /events/:eventId/... (deep link, F5) thì tự chọn sự kiện đó
function EventUrlSync() {
    const match = useMatch('/events/:eventId/*');
    const eventId = match?.params.eventId;
    const { selectEvent } = useActiveEvent();
    useEffect(() => {
        if (eventId && eventId !== 'new') selectEvent(eventId);
    }, [eventId, selectEvent]);
    return null;
}

function Shell() {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const { pathname } = useLocation();
    useEffect(() => setDrawerOpen(false), [pathname]);

    return (
        <div className="flex h-screen bg-canvas">
            <EventUrlSync />
            <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
            {drawerOpen && (
                <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setDrawerOpen(false)} />
            )}
            <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
                <Header onMenuClick={() => setDrawerOpen(true)} />
                <main className="mx-auto w-full max-w-[1440px] flex-1 p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default function MainLayout() {
    return (
        <AuthProvider>
            <ActiveEventProvider>
                <Shell />
            </ActiveEventProvider>
        </AuthProvider>
    );
}