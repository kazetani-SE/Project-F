import { useEffect, useState, type ReactNode } from 'react';
import { ToastContext } from './toastContext';

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toast, setToast] = useState<{ message: string } | null>(null);
    useEffect(() => {
        if (!toast) return;
        const timer = window.setTimeout(() => setToast(null), 3000);
        return () => window.clearTimeout(timer);
    }, [toast]);

    return <ToastContext value={(message) => setToast({ message })}>
        {children}
        <div role="status" className="pointer-events-none fixed right-4 top-4 z-50 max-w-[calc(100%-2rem)]">
            {toast && <p className="rounded-lg bg-emerald-700 px-4 py-3 text-sm text-white shadow-lg">{toast.message}</p>}
        </div>
    </ToastContext>;
}
