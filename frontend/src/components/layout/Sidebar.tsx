import { NavLink, useNavigate } from 'react-router-dom';
import {
    CalendarDays, Wallet, Users, X, Loader2, Lock,
    LayoutDashboard, FileText, Calculator, Receipt, Scale, UserCog, BookOpen,
    type LucideIcon,
} from 'lucide-react';
import RoleBadge from '../ui/RoleBadge';
import {useActiveEvent} from "../../context/activeEventContext.ts";
import logo from "../../assets/NewFCode_Logo.png"

const SUB_ITEMS = [
    { to: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
    { to: 'documents', label: 'Tài liệu & Ấn phẩm', icon: FileText },
    { to: 'finance/budgets', label: 'Dự toán ngân sách', icon: Calculator },
    { to: 'finance/expenses', label: 'Thực chi & Duyệt chi', icon: Receipt },
    { to: 'finance/benchmarks', label: 'Benchmark', icon: Scale },
    { to: 'organizers', label: 'Thành viên BTC', icon: UserCog },
    { to: 'knowledge', label: 'Kho tri thức', icon: BookOpen },
];

interface NavItemProps {
    to: string;
    label: string;
    icon: LucideIcon;
    end?: boolean;
    disabled?: boolean;
    compact?: boolean;
    onClick?: () => void;
}

function NavItem({ to, label, icon: Icon, end, disabled, compact, onClick }: NavItemProps) {
    return (
        <NavLink
            to={to}
            end={end}
            aria-disabled={disabled}
            tabIndex={disabled ? -1 : 0}
            onClick={(e) => (disabled ? e.preventDefault() : onClick?.())}
            className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl text-sm transition-colors ${
                    compact ? 'px-3 py-2' : 'px-3.5 py-2.5'
                } ${
                    isActive
                        ? 'bg-emerald-50/90 font-semibold text-emerald-700'
                        : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                } ${disabled ? 'pointer-events-none opacity-40' : ''}`
            }
        >
            {({ isActive }) => (
                <>
                    <Icon
                        className={`shrink-0 ${compact ? 'h-4 w-4' : 'h-5 w-5'} ${
                            isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                    />
                    <span>{label}</span>
                </>
            )}
        </NavLink>
    );
}

interface Props { open: boolean; onClose: () => void }

export default function Sidebar({ open, onClose }: Props) {
    const { currentEvent, roleStatus, role, selectEvent } = useActiveEvent();
    const navigate = useNavigate();
    const unlocked = roleStatus === 'granted';

    const deselect = () => {
        selectEvent(null);
        navigate('/events');
    };

    return (
        <aside
            className={`fixed inset-y-0 left-0 z-40 flex w-64 select-none flex-col justify-between overflow-y-auto border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 ${
                open ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
            <div className="p-5">
                {/* Brand */}
                <div className="mb-8 flex items-center gap-3">
                    <img src={logo} alt="F-Code Logo" className="h-10 w-auto object-contain" />
                    <div className="flex flex-col">
                        <span className="text-base font-bold leading-tight tracking-tight text-slate-900">F-Code</span>
                        <span className="text-xs font-medium leading-tight text-slate-500">Event Management</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 lg:hidden"
                        aria-label="Đóng menu"
                    >
                        <X size={18} />
                    </button>
                </div>

                <nav aria-label="Main Navigation" className="space-y-1.5">
                    <NavItem to="/events" end={!currentEvent} icon={CalendarDays} label="Sự kiện" onClick={onClose} />

                    {currentEvent && (
                        <div className="ml-5 border-l-2 border-emerald-200 pl-3">
                            {/* Thẻ sự kiện đang chọn */}
                            <div className="my-2 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-900">{currentEvent.name}</p>
                                        {currentEvent.seasonLabel && (
                                            <p className="truncate text-xs text-slate-500">{currentEvent.seasonLabel}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={deselect}
                                        className="rounded p-0.5 text-slate-400 hover:bg-white hover:text-slate-900"
                                        aria-label="Bỏ chọn sự kiện"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                                <div className="mt-2">
                                    {roleStatus === 'checking' && (
                                        <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Loader2 size={12} className="animate-spin" /> Đang kiểm tra vai trò…
                    </span>
                                    )}
                                    {roleStatus === 'granted' && role && <RoleBadge role={role} />}
                                    {roleStatus === 'denied' && (
                                        <span className="flex items-center gap-1.5 text-xs font-medium text-rose-600">
                      <Lock size={12} /> Không thuộc BTC
                    </span>
                                    )}
                                </div>
                            </div>

                            {/* Menu con: khóa cho tới khi có vai trò */}
                            <ul className="space-y-0.5">
                                {SUB_ITEMS.map((it) => (
                                    <li key={it.to}>
                                        <NavItem
                                            compact
                                            to={`/events/${currentEvent.id}/${it.to}`}
                                            icon={it.icon}
                                            label={it.label}
                                            disabled={!unlocked}
                                            onClick={onClose}
                                        />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <NavItem to="/budget" icon={Wallet} label="Budget" onClick={onClose} />
                    <NavItem to="/members" icon={Users} label="Thành viên" onClick={onClose} />
                </nav>
            </div>

            {/* Ghi chú chỉ hiện khi chưa chọn sự kiện */}
            {!currentEvent && (
                <div className="m-3 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/30 p-4">
                    <p className="text-xs leading-relaxed text-slate-500">
                        Chọn một sự kiện để mở Tài liệu, Dự toán, Thực chi, Benchmark, BTC và Kho tri thức của sự kiện đó.
                    </p>
                </div>
            )}
        </aside>
    );
}