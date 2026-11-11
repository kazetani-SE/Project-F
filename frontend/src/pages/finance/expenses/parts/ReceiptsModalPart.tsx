import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { ReceiptThumbnailItem } from '../components/ReceiptThumbnailItem';
import type { Expense, CreateReceiptRequest } from '../../../../types/models/finance';

interface ReceiptsModalPartProps {
    isOpen: boolean;
    expense: Expense | null;
    onClose: () => void;
    onAddReceipt: (expenseId: string, data: CreateReceiptRequest) => Promise<void>;
    onViewImage: (url: string) => void;
}

export const ReceiptsModalPart: React.FC<ReceiptsModalPartProps> = ({
    isOpen,
    expense,
    onClose,
    onAddReceipt,
    onViewImage,
}) => {
    const [receiptCode, setReceiptCode] = useState('');
    const [supplierName, setSupplierName] = useState('');
    const [imageUrl, setImageUrl] = useState('');

    if (!isOpen || !expense) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!imageUrl.trim()) return;

        await onAddReceipt(expense.id, {
            receiptCode: receiptCode.trim() || undefined,
            supplierName: supplierName.trim() || undefined,
            imageUrl: imageUrl.trim(),
        });

        setReceiptCode('');
        setSupplierName('');
        setImageUrl('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Chứng Từ Hóa Đơn Chi Tiêu</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{expense.itemName}</p>
                    </div>
                    <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
                </div>

                {/* List existing receipts */}
                <div className="mt-4 space-y-2.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Danh sách hóa đơn đã đính kèm ({expense.receipts?.length ?? 0})
                    </h4>
                    {(!expense.receipts || expense.receipts.length === 0) ? (
                        <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                            Chưa có chứng từ nào. Vui lòng thêm ít nhất 1 chứng từ để được duyệt chi.
                        </div>
                    ) : (
                        expense.receipts.map((r) => (
                            <ReceiptThumbnailItem
                                key={r.id}
                                receipt={r}
                                onViewImage={onViewImage}
                            />
                        ))
                    )}
                </div>

                {/* Add new receipt form */}
                <form onSubmit={handleSubmit} className="mt-5 border-t border-slate-100 pt-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800">Thêm chứng từ mới</h4>
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="text"
                            value={receiptCode}
                            onChange={(e) => setReceiptCode(e.target.value)}
                            placeholder="Mã hóa đơn..."
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                        />
                        <input
                            type="text"
                            value={supplierName}
                            onChange={(e) => setSupplierName(e.target.value)}
                            placeholder="Đơn vị cung cấp..."
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                        />
                    </div>
                    <input
                        type="url"
                        required
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="Đường dẫn ảnh hóa đơn S3 (URL) *"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                    />
                    <div className="flex justify-end pt-1">
                        <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Lưu Chứng Từ
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

