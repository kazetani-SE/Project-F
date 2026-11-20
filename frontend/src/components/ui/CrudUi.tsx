import type { ReactNode } from 'react';
import type { PageResponse } from '../../types/common/api';

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
    return <div role="status" aria-label="Đang tải…" className={`${panel} space-y-3`}>
        <div aria-hidden="true" className="h-4 w-2/5 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
        <div aria-hidden="true" className="h-3 w-4/5 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
        <div aria-hidden="true" className="h-3 w-3/5 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
    </div>;
}

export function RetryNotice({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
    if (!error) return null;
    return <div className="space-y-3">
        <ErrorNotice error={error} />
        {onRetry && <button type="button" className={secondary} onClick={onRetry}>Thử lại</button>}
    </div>;
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
    return <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {action}
    </div>;
}

export function Pagination({ pageData, onChange }: {
    pageData: Pick<PageResponse<unknown>, 'pageNumber' | 'totalPages' | 'isFirst' | 'hasNext'>;
    onChange: (page: number) => void;
}) {
    const { pageNumber: page, totalPages, isFirst, hasNext } = pageData;
    if (totalPages <= 1 && page === 0) return null;
    return <nav className="flex flex-wrap items-center gap-3" aria-label="Phân trang">
        <button type="button" className={secondary} disabled={isFirst} onClick={() => onChange(page - 1)}>Trang trước</button>
        <span>Trang {page + 1} / {Math.max(totalPages, 1)}</span>
        <button type="button" className={secondary} disabled={!hasNext} onClick={() => onChange(page + 1)}>Trang sau</button>
    </nav>;
}
