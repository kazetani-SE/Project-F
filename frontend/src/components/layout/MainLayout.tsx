import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import {ActiveEventProvider} from "../../context/ActiveEventProvider.tsx";

function Shell() {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const { pathname } = useLocation();
    useEffect(() => setDrawerOpen(false), [pathname]);

    return (
        <div className="flex h-screen bg-canvas">
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
        <ActiveEventProvider>
            <Shell />
        </ActiveEventProvider>
    );
}
