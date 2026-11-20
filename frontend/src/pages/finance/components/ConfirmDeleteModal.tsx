import React from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    title?: string;
    message?: string;
    itemName?: string;
    isLoading?: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
    isOpen,
    title = 'Xác nhận xóa',
    message = 'Bạn có chắc chắn muốn xóa mục này? Thao tác này không thể hoàn tác.',
    itemName,
    isLoading = false,
    onClose,
    onConfirm,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in duration-200">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-rose-50 p-2.5 text-rose-600">
                            <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                            {itemName && (
                                <p className="text-xs font-semibold text-rose-600 mt-0.5 max-w-[280px] truncate">
                                    {itemName}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                    {message}
                </p>

                <div className="mt-6 flex justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
                    >
                        {isLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                        {isLoading ? 'Đang xóa...' : 'Xác nhận xóa'}
                    </button>
                </div>
            </div>
        </div>
    );
};
