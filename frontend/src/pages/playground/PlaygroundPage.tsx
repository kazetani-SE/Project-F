import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CalendarDays,
    Layers,
    Search,
    Upload,
    Plus,
    FileText,
    BookOpen,
    ChevronRight,
    Edit3,
    Ban,
    Loader2,
} from 'lucide-react';
import { useActiveEvent } from '../../context/activeEventContext';
import EventStatusBadge from '../../components/ui/EventStatusBadge';
import type { EventStatus, EventSummary } from '../../types/models/event';

export default function PlaygroundPage() {
    const navigate = useNavigate();
    const { events, isLoading, selectEvent, currentEvent } = useActiveEvent();

    const [activeTab, setActiveTab] = useState<'ALL' | 'MULTI_SEASON'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | EventStatus>('ALL');

    // Filter events
    const filteredEvents = events.filter((ev) => {
        const matchesTab = activeTab === 'ALL' || (activeTab === 'MULTI_SEASON' && Boolean(ev.seriesId));
        const matchesQuery =
            ev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (ev.seasonLabel && ev.seasonLabel.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (ev.location && ev.location.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesStatus = statusFilter === 'ALL' || ev.status === statusFilter;
        return matchesTab && matchesQuery && matchesStatus;
    });

    // Group events by year
    const eventsByYear = filteredEvents.reduce<Record<number, EventSummary[]>>((acc, ev) => {
        const year = ev.year || 2026;
        if (!acc[year]) acc[year] = [];
        acc[year].push(ev);
        return acc;
    }, {});

    const sortedYears = Object.keys(eventsByYear)
        .map(Number)
        .sort((a, b) => b - a);

    const handleSelectAndOpen = (event: EventSummary, targetPath?: string) => {
        selectEvent(event.id);
        if (targetPath) {
            navigate(targetPath);
        } else {
            navigate(`/events/${event.id}/documents`);
        }
    };

    const multiSeasonCount = events.filter((e) => Boolean(e.seriesId)).length;

    const formatCurrency = (val?: number | null) => {
        if (val == null) return '—';
        return new Intl.NumberFormat('vi-VN').format(val) + ' đ';
    };

    const formatDateRange = (ev: EventSummary) => {
        if (!ev.startDate) return '—';
        const start = new Date(ev.startDate).toLocaleDateString('vi-VN');
        if (!ev.endDate || ev.endDate === ev.startDate) return start;
        const end = new Date(ev.endDate).toLocaleDateString('vi-VN');
        return `${start} – ${end}`;
    };

    return (
        <div className="space-y-6">
            {/* Top Title & Action Buttons */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        F-Code Club
                    </span>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Sự kiện
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
                    >
                        <Upload className="h-4 w-4 text-slate-500" />
                        <span>Import</span>
                    </button>
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Tạo sự kiện</span>
                    </button>
                </div>
            </div>

            {/* Tab Navigation matching Figma */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('ALL')}
                    className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                        activeTab === 'ALL'
                            ? 'border-emerald-600 text-emerald-700'
                            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                    }`}
                >
                    <CalendarDays className="h-4 w-4" />
                    <span>Mọi sự kiện</span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                        {events.length}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('MULTI_SEASON')}
                    className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                        activeTab === 'MULTI_SEASON'
                            ? 'border-emerald-600 text-emerald-700'
                            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                    }`}
                >
                    <Layers className="h-4 w-4" />
                    <span>Sự kiện đa mùa</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                        {multiSeasonCount}
                    </span>
                </button>
            </div>

            {/* Search Bar & Filter Pills matching Figma */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative min-w-[280px] flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm theo tên sự kiện, mùa..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-hidden"
                    />
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <button
                        onClick={() => setStatusFilter('ALL')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            statusFilter === 'ALL'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Tất cả
                    </button>
                    <button
                        onClick={() => setStatusFilter('PLANNING')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            statusFilter === 'PLANNING'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Lên kế hoạch
                    </button>
                    <button
                        onClick={() => setStatusFilter('APPROVED')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            statusFilter === 'APPROVED'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Đã duyệt
                    </button>
                    <button
                        onClick={() => setStatusFilter('IN_PROGRESS')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            statusFilter === 'IN_PROGRESS'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Đang diễn ra
                    </button>
                    <button
                        onClick={() => setStatusFilter('COMPLETED')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            statusFilter === 'COMPLETED'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Hoàn thành
                    </button>
                    <button
                        onClick={() => setStatusFilter('CANCELLED')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            statusFilter === 'CANCELLED'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Đã hủy
                    </button>
                </div>
            </div>

            {/* Events Table Container matching Figma */}
            {isLoading ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    <p className="text-sm">Đang tải danh sách sự kiện…</p>
                </div>
            ) : filteredEvents.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                    <CalendarDays className="h-10 w-10 text-slate-400" />
                    <h3 className="mt-3 text-sm font-semibold text-slate-700">Không tìm thấy sự kiện phù hợp</h3>
                    <p className="mt-1 text-xs text-slate-400">
                        Vui lòng thử tìm kiếm với từ khóa khác hoặc điều chỉnh bộ lọc trạng thái.
                    </p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="py-3 px-5">Sự kiện</th>
                                    <th className="py-3 px-5">Thời gian dự kiến</th>
                                    <th className="py-3 px-5">Địa điểm</th>
                                    <th className="py-3 px-5">Quỹ cấp phát</th>
                                    <th className="py-3 px-5">Trạng thái</th>
                                    <th className="py-3 px-5 text-right">Phân hệ Task 3 & Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedYears.map((year) => (
                                    <React.Fragment key={year}>
                                        {/* Year Divider Header */}
                                        <tr className="bg-slate-50/70 border-y border-slate-100">
                                            <td
                                                colSpan={6}
                                                className="py-2.5 px-5 text-xs font-bold uppercase tracking-wider text-slate-600"
                                            >
                                                Năm {year}
                                            </td>
                                        </tr>

                                        {eventsByYear[year].map((ev) => {
                                            const isSelected = currentEvent?.id === ev.id;
                                            return (
                                                <tr
                                                    key={ev.id}
                                                    className={`border-b border-slate-100 transition-colors ${
                                                        isSelected
                                                            ? 'bg-emerald-50/60'
                                                            : 'hover:bg-slate-50/80'
                                                    }`}
                                                >
                                                    {/* SỰ KIỆN */}
                                                    <td className="py-4 px-5">
                                                        <div className="flex items-center gap-2">
                                                            <div>
                                                                <p
                                                                    className={`font-semibold ${
                                                                        ev.status === 'CANCELLED'
                                                                            ? 'line-through text-slate-400'
                                                                            : 'text-slate-900'
                                                                    }`}
                                                                >
                                                                    {ev.name}
                                                                </p>
                                                                <p className="mt-0.5 text-xs text-slate-500 flex items-center gap-1.5">
                                                                    {ev.seriesId ? (
                                                                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                                                                            <Layers className="h-3 w-3" />
                                                                            {ev.seasonLabel || 'Sự kiện chuỗi'}
                                                                        </span>
                                                                    ) : (
                                                                        <span>
                                                                            Sự kiện đơn · {year}
                                                                        </span>
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* THỜI GIAN DỰ KIẾN */}
                                                    <td className="py-4 px-5 text-xs text-slate-700">
                                                        {formatDateRange(ev)}
                                                    </td>

                                                    {/* ĐỊA ĐIỂM */}
                                                    <td className="py-4 px-5 text-xs text-slate-700">
                                                        {ev.location || '—'}
                                                    </td>

                                                    {/* QUỸ CẤP PHÁT */}
                                                    <td className="py-4 px-5 text-xs font-medium text-slate-800">
                                                        {formatCurrency(ev.allocatedBudget)}
                                                    </td>

                                                    {/* TRẠNG THÁI */}
                                                    <td className="py-4 px-5">
                                                        <EventStatusBadge status={ev.status} />
                                                    </td>

                                                    {/* ACTIONS & QUICK SHORTCUTS TO TASK 3 */}
                                                    <td className="py-4 px-5 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {/* Quick shortcut to Documents */}
                                                            <button
                                                                onClick={() =>
                                                                    handleSelectAndOpen(
                                                                        ev,
                                                                        `/events/${ev.id}/documents`,
                                                                    )
                                                                }
                                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                                                                title="Mở phân hệ Tài liệu & Ấn phẩm (Task 3)"
                                                            >
                                                                <FileText className="h-3.5 w-3.5 text-emerald-600" />
                                                                <span className="hidden sm:inline">Tài liệu</span>
                                                            </button>

                                                            {/* Quick shortcut to Knowledge */}
                                                            <button
                                                                onClick={() =>
                                                                    handleSelectAndOpen(
                                                                        ev,
                                                                        `/events/${ev.id}/knowledge`,
                                                                    )
                                                                }
                                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                                                                title="Mở phân hệ Kho tri thức (Task 3)"
                                                            >
                                                                <BookOpen className="h-3.5 w-3.5 text-amber-600" />
                                                                <span className="hidden sm:inline">Tri thức</span>
                                                            </button>

                                                            {/* Edit Icon */}
                                                            <button
                                                                type="button"
                                                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                                                title="Chỉnh sửa sự kiện"
                                                            >
                                                                <Edit3 className="h-4 w-4" />
                                                            </button>

                                                            {/* Ban/Cancel Icon */}
                                                            <button
                                                                type="button"
                                                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                                                title="Hủy sự kiện"
                                                            >
                                                                <Ban className="h-4 w-4" />
                                                            </button>

                                                            {/* Open Event Arrow */}
                                                            <button
                                                                onClick={() => handleSelectAndOpen(ev)}
                                                                className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                                                                title="Vào sự kiện"
                                                            >
                                                                <ChevronRight className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
