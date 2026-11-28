import { useState } from 'react';
import { Plus, Sparkles, RefreshCw, AlertCircle, X, Download, Upload } from 'lucide-react';
import { useActiveEvent } from '../../../context/activeEventContext';
import { useBudgetItems } from '../hooks/useBudgetItems';
import { BudgetSummaryPart } from './parts/BudgetSummaryPart';
import { BudgetFilterPart } from './parts/BudgetFilterPart';
import { BudgetItemTablePart } from './parts/BudgetItemTablePart';
import { CreateBudgetItemModalPart } from './parts/CreateBudgetItemModalPart';
import { AutoProjectModalPart } from './parts/AutoProjectModalPart';
import { BudgetItemDetailModalPart } from './parts/BudgetItemDetailModalPart';
import { ImportBudgetItemsModalPart } from './parts/ImportBudgetItemsModalPart';
import { exportBudgetItemTemplate } from './utils/budgetExcelUtils';
import { RejectReasonModal } from '../components/RejectReasonModal';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { ConfirmApproveBudgetItemModal } from '../components/ConfirmApproveBudgetItemModal';
import { ErrorModal } from '../components/ErrorModal';
import type { BudgetItem, CreateBudgetItemRequest } from '../../../types/models/finance';

export default function BudgetItemsPage() {
    const { currentEvent, currentEventId, events } = useActiveEvent();

    const {
        budgetItems,
        categories,
        benchmarks,
        filteredItems,
        totalEstimatedSum,
        loading,
        isSubmitting,
        errorMessage,
        clearError,
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

    // Form Modals
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [projectModalOpen, setProjectModalOpen] = useState(false);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [targetRejectItem, setTargetRejectItem] = useState<BudgetItem | null>(null);
    const [targetApproveItem, setTargetApproveItem] = useState<BudgetItem | null>(null);
    const [selectedDetailItemId, setSelectedDetailItemId] = useState<string | null>(null);

    // Delete Confirmation Modal
    const [deleteTargetItem, setDeleteTargetItem] = useState<BudgetItem | null>(null);

    const handleOpenRejectModal = (item: BudgetItem) => {
        setTargetRejectItem(item);
        setRejectModalOpen(true);
    };

    const handleOpenApproveModal = (item: BudgetItem) => {
        setTargetApproveItem(item);
    };

    const handleConfirmApproveItem = async () => {
        if (!targetApproveItem) return;
        try {
            await approveBudgetItem(targetApproveItem);
            setTargetApproveItem(null);
            setSelectedDetailItemId(null);
        } catch {
            // ErrorModal will display the backend error
        }
    };

    const handleBatchImport = async (items: CreateBudgetItemRequest[]) => {
        let successCount = 0;
        let failureCount = 0;
        for (const item of items) {
            try {
                await createBudgetItem(item);
                successCount++;
            } catch {
                failureCount++;
            }
        }
        if (successCount > 0) {
            setNotification({
                type: 'success',
                text: `Đã nhập thành công ${successCount} hạng mục dự trù${failureCount > 0 ? ` (${failureCount} thất bại)` : ''}!`,
            });
            await reloadData();
        } else if (failureCount > 0) {
            setNotification({
                type: 'error',
                text: `Nhập thất bại ${failureCount} hạng mục. Vui lòng kiểm tra lại dữ liệu.`,
            });
        }
        return { successCount, failureCount };
    };

    const handleConfirmDelete = async () => {
        if (!deleteTargetItem) return;
        try {
            await deleteBudgetItem(deleteTargetItem.id);
            setDeleteTargetItem(null);
        } catch {
            // ErrorModal will display the backend error
        }
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
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Làm mới
                    </button>
                    <button
                        onClick={() => exportBudgetItemTemplate(categories)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:text-emerald-700 transition-colors"
                        title="Tải file Excel mẫu để nhập hàng loạt"
                    >
                        <Download className="h-4 w-4 text-emerald-600" />
                        Xuất Mẫu Excel
                    </button>
                    <button
                        onClick={() => setImportModalOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-700 shadow-sm hover:bg-emerald-100 transition-colors"
                        title="Nhập nhiều hạng mục từ file Excel"
                    >
                        <Upload className="h-4 w-4" />
                        Nhập Excel (Import)
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
                loading={loading}
                onViewDetail={(item) => setSelectedDetailItemId(item.id)}
                onApprove={handleOpenApproveModal}
                onReject={handleOpenRejectModal}
                onDelete={(item) => setDeleteTargetItem(item)}
            />

            {/* Modals */}
            <BudgetItemDetailModalPart
                isOpen={!!selectedDetailItemId}
                itemId={selectedDetailItemId}
                eventId={currentEventId}
                categories={categories}
                onClose={() => setSelectedDetailItemId(null)}
                onApprove={handleOpenApproveModal}
                onReject={handleOpenRejectModal}
            />

            <CreateBudgetItemModalPart
                isOpen={createModalOpen}
                categories={categories}
                benchmarks={benchmarks}
                isSubmitting={isSubmitting}
                onClose={() => setCreateModalOpen(false)}
                onSubmit={createBudgetItem}
            />

            <ImportBudgetItemsModalPart
                isOpen={importModalOpen}
                categories={categories}
                onClose={() => setImportModalOpen(false)}
                onImportItems={handleBatchImport}
            />

            <AutoProjectModalPart
                isOpen={projectModalOpen}
                availableEvents={otherEvents}
                projectedPreview={projectedPreview}
                loading={projectLoading}
                isSubmitting={isSubmitting}
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
                        try {
                            await rejectBudgetItem(targetRejectItem.id, reason);
                            setRejectModalOpen(false);
                        } catch {
                            // ErrorModal will display the backend error
                        }
                    }
                }}
            />

            {/* Approve Budget Item Confirmation Modal */}
            <ConfirmApproveBudgetItemModal
                isOpen={!!targetApproveItem}
                item={targetApproveItem}
                categories={categories}
                isLoading={isSubmitting}
                onClose={() => setTargetApproveItem(null)}
                onConfirm={handleConfirmApproveItem}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmDeleteModal
                isOpen={!!deleteTargetItem}
                title="Xóa hạng mục dự trù"
                itemName={deleteTargetItem?.itemName}
                message={`Bạn có chắc chắn muốn xóa hạng mục ngân sách "${deleteTargetItem?.itemName}"? Lưu ý: Hạng mục đã phát sinh chi tiêu thực tế được duyệt sẽ không thể xóa.`}
                isLoading={isSubmitting}
                onClose={() => setDeleteTargetItem(null)}
                onConfirm={handleConfirmDelete}
            />

            {/* Error Modal */}
            <ErrorModal
                isOpen={!!errorMessage}
                message={errorMessage ?? ''}
                onClose={clearError}
            />
        </div>
    );
}
