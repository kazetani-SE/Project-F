import { Link, useLocation } from 'react-router-dom';
import { Bell, ChevronRight, Menu, Search } from 'lucide-react';
import { CLUB_ROLE_LABEL } from '../../constants/enum/role';
import {useActiveEvent} from "../../context/activeEventContext.ts";
import {useAuth} from "../../context/authContext.ts";

const LABELS: Record<string, string> = {
    events: 'Sự kiện', budget: 'Budget', members: 'Thành viên',
    overview: 'Tổng quan', documents: 'Tài liệu & Ấn phẩm', finance: 'Tài chính',
    budgets: 'Dự toán ngân sách', expenses: 'Thực chi & Duyệt chi', benchmarks: 'Benchmark',
    organizers: 'Thành viên BTC', knowledge: 'Kho tri thức',
};

const initials = (name: string) =>
    name.split(' ').filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase();

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
    const { pathname } = useLocation();
    const { currentEvent } = useActiveEvent();
    const { user } = useAuth();

    const segments = pathname.split('/').filter(Boolean);
    const crumbs = segments.map((seg, i) => ({
        label: seg === currentEvent?.id ? currentEvent.name : (LABELS[seg] ?? seg),
        to: '/' + segments.slice(0, i + 1).join('/'),
    }));

    return (
        <header className="flex h-16 w-full shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
                <button
                    onClick={onMenuClick}
                    className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
                    aria-label="Mở menu"
                >
                    <Menu size={20} />
                </button>

                {/* Breadcrumb (giữ nguyên logic bản cũ) */}
                <nav className="hidden min-w-0 items-center gap-1 text-sm sm:flex" aria-label="Breadcrumb">
                    {crumbs.length === 0 && <span className="font-medium text-slate-900">Trang chủ</span>}
                    {crumbs.map((c, i) => (
                        <span key={c.to} className="flex min-w-0 items-center gap-1">
              {i > 0 && <ChevronRight size={14} className="shrink-0 text-slate-400" />}
                            {i === crumbs.length - 1 ? (
                                <span className="truncate font-medium text-slate-900">{c.label}</span>
                            ) : (
                                <Link to={c.to} className="truncate text-slate-500 hover:text-emerald-600">
                                    {c.label}
                                </Link>
                            )}
            </span>
                    ))}
                </nav>

                {/* Màn hình nhỏ: chỉ hiện mục cuối của breadcrumb */}
                <span className="truncate text-base font-semibold text-slate-900 sm:hidden">
          {crumbs.length ? crumbs[crumbs.length - 1].label : 'Trang chủ'}
        </span>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative hidden w-80 md:block">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="h-4 w-4" />
          </span>
                    <input
                        type="search"
                        placeholder="Tìm chứng từ, vật tư, sự cố..."
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition-all hover:bg-slate-100/80 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                </div>

                <button
                    type="button"
                    aria-label="Thông báo"
                    className="relative rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                    <Bell className="h-5 w-5" />
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
                </button>

                <div className="flex items-center gap-3 pl-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-xs font-bold text-white shadow-sm">
                        {user ? initials(user.fullName) : '?'}
                    </div>
                    <div className="hidden flex-col text-left sm:flex">
                        <span className="text-sm font-semibold leading-tight text-slate-900">{user?.fullName ?? '…'}</span>
                        {user && (
                            <span className="mt-0.5 inline-block rounded bg-amber-400 px-2 py-0.5 text-center text-[9px] font-bold uppercase leading-tight tracking-wider text-amber-950">
                {CLUB_ROLE_LABEL[user.clubRole]}
              </span>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}