import { useState } from 'react';
import { Plus, Sparkles, RefreshCw, AlertCircle, X } from 'lucide-react';
import { useActiveEvent } from '../../../context/activeEventContext';
import { useBudgetItems } from '../hooks/useBudgetItems';
import { BudgetSummaryPart } from './parts/BudgetSummaryPart';
import { BudgetFilterPart } from './parts/BudgetFilterPart';
import { BudgetItemTablePart } from './parts/BudgetItemTablePart';
import { CreateBudgetItemModalPart } from './parts/CreateBudgetItemModalPart';
import { AutoProjectModalPart } from './parts/AutoProjectModalPart';
import { RejectReasonModal } from '../components/RejectReasonModal';
import type { BudgetItem } from '../../../types/models/finance';

export default function BudgetItemsPage() {
    const { currentEvent, currentEventId, events } = useActiveEvent();

    const {
        budgetItems,
        categories,
        benchmarks,
        filteredItems,
        totalEstimatedSum,
        loading,
        statusFilter,
        setStatusFilter,
        categoryFilter,
        setCategoryFilter,
        notification,
        setNotification,
        projectedPreview,
        projectLoading,
        reloadData,
        createBudgetItem,
        approveBudgetItem,
        rejectBudgetItem,
        deleteBudgetItem,
        previewAutoProject,
        confirmAutoProject,
    } = useBudgetItems(currentEventId ?? undefined);

    // Modals
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [projectModalOpen, setProjectModalOpen] = useState(false);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [targetRejectItem, setTargetRejectItem] = useState<BudgetItem | null>(null);

    const handleOpenRejectModal = (item: BudgetItem) => {
        setTargetRejectItem(item);
        setRejectModalOpen(true);
    };

    if (!currentEventId || !currentEvent) {
        return (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-8 text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
                <h2 className="mt-4 text-lg font-bold text-slate-800">Chưa chọn Mùa sự kiện</h2>
                <p className="mt-2 text-sm text-slate-600">
                    Vui lòng chọn Mùa sự kiện ở thanh menu trước khi lập dự trù ngân sách.
                </p>
            </div>
        );
    }

    const otherEvents = events.filter(e => e.id !== currentEventId);

    return (
        <div className="space-y-6">
            {/* Header Layout */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Dự Toán Ngân Sách Mùa Sự Kiện
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Lập đề xuất kinh phí & Kế thừa định mức tự động
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={reloadData}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Làm mới
                    </button>
                    <button
                        onClick={() => setProjectModalOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 text-sm font-semibold text-purple-700 shadow-sm hover:bg-purple-100 transition-colors"
                    >
                        <Sparkles className="h-4 w-4" />
                        Kế Thừa Mùa Trước
                    </button>
                    <button
                        onClick={() => setCreateModalOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                    >
                        <Plus className="h-4 w-4" />
                        Thêm Dự Trù Mới
                    </button>
                </div>
            </div>

            {/* Notification alert */}
            {notification && (
                <div className={`rounded-xl p-4 text-sm flex items-center justify-between ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}>
                    <span>{notification.text}</span>
                    <button onClick={() => setNotification(null)}><X className="h-4 w-4" /></button>
                </div>
            )}

            {/* Summary Part */}
            <BudgetSummaryPart
                totalEstimatedSum={totalEstimatedSum}
                items={budgetItems}
            />

            {/* Filter Part */}
            <BudgetFilterPart
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                categoryFilter={categoryFilter}
                onCategoryChange={setCategoryFilter}
                categories={categories}
            />

            {/* Table Part */}
            <BudgetItemTablePart
                items={filteredItems}
                categories={categories}
                onApprove={approveBudgetItem}
                onReject={handleOpenRejectModal}
                onDelete={deleteBudgetItem}
            />

            {/* Modals */}
            <CreateBudgetItemModalPart
                isOpen={createModalOpen}
                categories={categories}
                benchmarks={benchmarks}
                onClose={() => setCreateModalOpen(false)}
                onSubmit={createBudgetItem}
            />

            <AutoProjectModalPart
                isOpen={projectModalOpen}
                availableEvents={otherEvents}
                projectedPreview={projectedPreview}
                loading={projectLoading}
                onClose={() => setProjectModalOpen(false)}
                onSelectPreviousEvent={previewAutoProject}
                onConfirm={confirmAutoProject}
            />

            <RejectReasonModal
                isOpen={rejectModalOpen}
                title="Từ Chối Hạng Mục Dự Trù"
                itemDescription={targetRejectItem?.itemName ? `Hạng mục: ${targetRejectItem.itemName}` : undefined}
                onClose={() => setRejectModalOpen(false)}
                onConfirm={async (reason) => {
                    if (targetRejectItem) {
                        await rejectBudgetItem(targetRejectItem.id, reason);
                        setRejectModalOpen(false);
                    }
                }}
            />
        </div>
    );
}
