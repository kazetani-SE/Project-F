import React, { useState, useEffect } from 'react';
import { X, Paperclip } from 'lucide-react';
import { formatVND } from '../../components/CurrencyText';
import type { BudgetItem, CreateExpenseRequest } from '../../../../types/models/finance';

interface CreateExpenseModalPartProps {
    isOpen: boolean;
    budgetItems: BudgetItem[];
    onClose: () => void;
    onSubmit: (data: CreateExpenseRequest) => Promise<void>;
}

export const CreateExpenseModalPart: React.FC<CreateExpenseModalPartProps> = ({
    isOpen,
    budgetItems,
    onClose,
    onSubmit,
}) => {
    const [selectedBudgetItemId, setSelectedBudgetItemId] = useState<string>('');
    const [itemName, setItemName] = useState('');
    const [quantity, setQuantity] = useState<number>(1);
    const [actualPrice, setActualPrice] = useState<number>(0);
    const [paidBy, setPaidBy] = useState<string>('00000000-0000-0000-0000-000000000001');
    const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');

    // Initial receipt attachment
    const [initReceiptCode, setInitReceiptCode] = useState('');
    const [initReceiptUrl, setInitReceiptUrl] = useState('');
    const [initReceiptSupplier, setInitReceiptSupplier] = useState('');

    useEffect(() => {
        if (isOpen) {
            setSelectedBudgetItemId('');
            setItemName('');
            setQuantity(1);
            setActualPrice(0);
            setPaidBy('00000000-0000-0000-0000-000000000001');
            setPaymentDate(new Date().toISOString().split('T')[0]);
            setNotes('');
            setInitReceiptCode('');
            setInitReceiptUrl('');
            setInitReceiptSupplier('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleBudgetItemSelect = (bId: string) => {
        setSelectedBudgetItemId(bId);
        if (!bId) return;
        const b = budgetItems.find(item => item.id === bId);
        if (b) {
            setItemName(b.itemName);
            setQuantity(b.quantity);
            setActualPrice(b.estimatedUnitPrice);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemName.trim()) return;

        const receiptsList = initReceiptUrl.trim() ? [{
            receiptCode: initReceiptCode.trim() || undefined,
            imageUrl: initReceiptUrl.trim(),
            supplierName: initReceiptSupplier.trim() || undefined,
        }] : [];

        await onSubmit({
            budgetItemId: selectedBudgetItemId || undefined,
            itemName: itemName.trim(),
            quantity,
            actualUnitPrice: actualPrice,
            paidBy,
            paymentDate,
            notes: notes.trim() || undefined,
            receipts: receiptsList,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">Ghi Nhận Thực Chi</h3>
                    <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
                </div>

                <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700">Khớp với Hạng mục dự trù (tùy chọn)</label>
                        <select
                            value={selectedBudgetItemId}
                            onChange={(e) => handleBudgetItemSelect(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                        >
                            <option value="">-- Khoản chi ngoài dự trù --</option>
                            {budgetItems.map(b => (
                                <option key={b.id} value={b.id}>
                                    {b.itemName} (Dự kiến: {formatVND(b.estimatedUnitPrice * b.quantity)})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700">Tên khoản chi *</label>
                        <input
                            type="text"
                            required
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                            placeholder="VD: Mua nước suối, In ấn backdrop..."
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700">Số lượng *</label>
                            <input
                                type="number"
                                required
                                min={0.01}
                                step="any"
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700">Đơn giá thực tế (VND) *</label>
                            <input
                                type="number"
                                required
                                min={0}
                                value={actualPrice}
                                onChange={(e) => setActualPrice(Number(e.target.value))}
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700">Ngày thanh toán *</label>
                            <input
                                type="date"
                                required
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700">Thành tiền tự tính</label>
                            <div className="mt-1 flex h-10 items-center rounded-xl bg-slate-50 px-3 text-sm font-bold text-emerald-700">
                                {formatVND(quantity * actualPrice)}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700">Mã định danh người chi (Member ID) *</label>
                        <input
                            type="text"
                            required
                            value={paidBy}
                            onChange={(e) => setPaidBy(e.target.value)}
                            placeholder="UUID thành viên chi trả"
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                        />
                    </div>

                    {/* Optional initial receipt */}
                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 space-y-2">
                        <label className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                            <Paperclip className="h-3.5 w-3.5 text-amber-600" />
                            Đính kèm Hóa đơn / Chứng từ S3 (Bắt buộc để được duyệt chi)
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="text"
                                value={initReceiptCode}
                                onChange={(e) => setInitReceiptCode(e.target.value)}
                                placeholder="Mã số HĐ (VD: HD-0012)"
                                className="rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none"
                            />
                            <input
                                type="text"
                                value={initReceiptSupplier}
                                onChange={(e) => setInitReceiptSupplier(e.target.value)}
                                placeholder="Nhà cung cấp / Cửa hàng"
                                className="rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none"
                            />
                        </div>
                        <input
                            type="url"
                            value={initReceiptUrl}
                            onChange={(e) => setInitReceiptUrl(e.target.value)}
                            placeholder="Đường dẫn ảnh/file hóa đơn S3 (URL)..."
                            className="w-full rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700">Ghi chú thực chi</label>
                        <textarea
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ghi chú hoàn ứng hoặc chuyển khoản..."
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                        >
                            Gửi Yêu Cầu Thanh Toán
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

