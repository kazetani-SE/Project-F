import type { ReactNode } from 'react';

export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
    return <main className="grid min-h-screen place-items-center bg-canvas p-4">
        <section className="w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div>
                <p className="text-sm font-semibold text-emerald-700">Project F</p>
                <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            </div>
            {children}
        </section>
    </main>;
}
