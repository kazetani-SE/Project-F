import type { ReactNode } from 'react';

export const field = 'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900';
export const button = 'inline-block rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50';
export const secondary = 'inline-block rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50';
export const link = 'font-medium text-emerald-700 hover:underline';
export const panel = 'rounded-xl border border-slate-200 bg-white p-5';

export function ErrorNotice({ error }: { error: unknown }) {
    if (!error) return null;
    const message = typeof error === 'object' && 'message' in error ? String(error.message) : 'Đã có lỗi xảy ra.';
    return <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{message}</p>;
}

export function Loading() {
    return <p role="status" className="text-sm text-slate-500">Đang tải…</p>;
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
    return <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {action}
    </div>;
}

export function Pagination({ page, totalPages, onChange }: {
    page: number; totalPages: number; onChange: (page: number) => void;
}) {
    if (totalPages <= 1 && page === 0) return null;
    return <nav className="flex flex-wrap items-center gap-3" aria-label="Phân trang">
        <button className={secondary} disabled={page === 0} onClick={() => onChange(page - 1)}>Trang trước</button>
        <span>Trang {page + 1} / {Math.max(totalPages, 1)}</span>
        <button className={secondary} disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)}>Trang sau</button>
    </nav>;
}
