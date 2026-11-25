import React, { useState, useEffect, useMemo } from 'react';
import { X, RefreshCw, ScanLine, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatVND } from '../../components/CurrencyText';
import { FileUploader } from '../../../../components/common/FileUploader';
import { useS3Upload } from '../../../../hooks/useS3Upload';
import { validateUploadFile } from '../../../../services/uploadWorkflow';
import type { BillScanResponse, BudgetItem, CreateExpenseRequest } from '../../../../types/models/finance';
import { useMemberOptions } from '../../hooks/useMemberOptions';
import { useBillScan } from '../../hooks/useBillScan';

interface CreateExpenseModalPartProps {
    isOpen: boolean;
    eventId: string;
    budgetItems: BudgetItem[];
    isSubmitting?: boolean;
    onClose: () => void;
    onSubmit: (data: CreateExpenseRequest) => Promise<void>;
}

const todayStr = () => new Date().toISOString().split('T')[0];

export const CreateExpenseModalPart: React.FC<CreateExpenseModalPartProps> = ({
    isOpen,
    eventId,
    budgetItems,
    isSubmitting = false,
    onClose,
    onSubmit,
}) => {
    const [selectedBudgetItemId, setSelectedBudgetItemId] = useState<string>('');
    const [itemName, setItemName] = useState('');
    const [quantity, setQuantity] = useState<number>(1);
    const [actualPrice, setActualPrice] = useState<number>(0);
    const [paidBy, setPaidBy] = useState<string>('');
    const [paymentDate, setPaymentDate] = useState<string>(todayStr());
    const [notes, setNotes] = useState('');

    // Receipt upload state
    const [initReceiptCode, setInitReceiptCode] = useState('');
    const [initReceiptSupplier, setInitReceiptSupplier] = useState('');
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [scanSuccess, setScanSuccess] = useState(false);
    const { isUploading, progress, error: uploadError, uploadFile, reset: resetUpload } = useS3Upload();

    // Danh sách người chi trả + quét hóa đơn
    const { options: memberOptions, isLoading: isLoadingMembers, error: memberError } = useMemberOptions(isOpen);
    const { isScanning, scan, reset: resetScan, error: scanError } = useBillScan(eventId);

    useEffect(() => {
        if (!isOpen) return;
        setSelectedBudgetItemId('');
        setItemName('');
        setQuantity(1);
        setActualPrice(0);
        setPaidBy('');
        setPaymentDate(todayStr());
        setNotes('');
        setInitReceiptCode('');
        setInitReceiptSupplier('');
        setReceiptFile(null);
        setScanSuccess(false);
        resetUpload();
        resetScan();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const canScan = useMemo(() => {
        if (!receiptFile) return false;
        try {
            validateUploadFile(receiptFile, 'RECEIPT');
            return true;
        } catch {
            return false;
        }
    }, [receiptFile]);

    if (!isOpen) return null;

    const handleBudgetItemSelect = (bId: string) => {
        setSelectedBudgetItemId(bId);
        if (!bId) return;
        const b = budgetItems.find((item) => item.id === bId);
        if (b) {
            setItemName(b.itemName);
            setQuantity(b.quantity);
            setActualPrice(b.estUnitPrice ?? b.estimatedUnitPrice ?? 0);
        }
    };

    // ===== HÀM ĐIỀN FORM từ kết quả quét (không đụng tới paidBy) =====
    const applyScanResult = (r: BillScanResponse) => {
        if (r.itemName) setItemName(r.itemName);
        setQuantity(Math.max(1, Math.round(r.quantity || 1)));
        setActualPrice(Math.max(0, Math.round(r.unitPrice || 0)));
        if (r.billDate && /^\d{4}-\d{2}-\d{2}$/.test(r.billDate)) setPaymentDate(r.billDate);
        if (r.receiptCode) setInitReceiptCode(r.receiptCode);
        if (r.storeName) setInitReceiptSupplier(r.storeName);
        if (r.notes) setNotes(r.notes);
    };

    const isBusy = isSubmitting || isUploading || isScanning;

    // ===== HÀM QUÉT: gọi API rồi điền form =====
    const handleScan = async () => {
        if (!receiptFile || isBusy) return;
        setScanSuccess(false);
        const result = await scan(receiptFile);
        if (result) {
            applyScanResult(result);
            setScanSuccess(true);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemName.trim() || !paidBy) return;

        try {
            let uploadedFileUrl: string | undefined = undefined;
            if (receiptFile) {
                const uploadRes = await uploadFile(receiptFile, 'RECEIPT');
                uploadedFileUrl = uploadRes.fileUrl;
            }

            const receiptsList = uploadedFileUrl
                ? [
                    {
                        receiptCode: initReceiptCode.trim() || undefined,
                        imageUrl: uploadedFileUrl,
                        supplierName: initReceiptSupplier.trim() || undefined,
                    },
                ]
                : [];

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
        } catch {
            // Do not close on error, error dialog will be displayed
        }
    };

    const totalExpense = quantity * actualPrice;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Thêm Khoản Chi Tiêu Thực Tế</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Khớp với dự trù ngân sách đã duyệt</p>
                    </div>
                    <button onClick={onClose} disabled={isBusy} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    {/* Link to approved budget item */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700">Khớp với Hạng mục Dự trù (Budget Item)</label>
                        <select
                            disabled={isBusy}
                            value={selectedBudgetItemId}
                            onChange={(e) => handleBudgetItemSelect(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                        >
                            <option value="">-- Chi phát sinh ngoài dự trù (hoặc tự nhập) --</option>
                            {budgetItems.map((b) => {
                                const unitPrice = b.estUnitPrice ?? b.estimatedUnitPrice ?? 0;
                                const total = b.totalEstAmount ?? b.totalEstimatedAmount ?? b.quantity * unitPrice;
                                return (
                                    <option key={b.id} value={b.id}>
                                        {b.itemName} (Dự kiến: {formatVND(total)})
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700">Tên khoản chi thực tế *</label>
                        <input
                            type="text"
                            required
                            disabled={isBusy}
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                            placeholder="VD: Mua 4 Standee tại Nhà in FPT"
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700">Số lượng *</label>
                            <input
                                type="number"
                                required
                                min={1}
                                disabled={isBusy}
                                value={quantity}
                                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700">Đơn giá thực tế (VND) *</label>
                            <input
                                type="number"
                                required
                                min={0}
                                disabled={isBusy}
                                value={actualPrice}
                                onChange={(e) => setActualPrice(parseInt(e.target.value) || 0)}
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700">Ngày thanh toán *</label>
                            <input
                                type="date"
                                required
                                disabled={isBusy}
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700">Người chi trả *</label>
                            <select
                                required
                                disabled={isBusy || isLoadingMembers}
                                value={paidBy}
                                onChange={(e) => setPaidBy(e.target.value)}
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                            >
                                <option value="">{isLoadingMembers ? 'Đang tải...' : '-- Chọn thành viên --'}</option>
                                {memberOptions.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                            {memberError && <p className="mt-1 text-[11px] text-rose-600">{memberError}</p>}
                        </div>
                    </div>

                    {/* Receipt section using FileUploader (RECEIPT category) */}
                    <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
                        <div>
                            <h4 className="text-xs font-bold text-slate-900">Đính kèm chứng từ ban đầu (khuyến nghị)</h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                Khoản chi bắt buộc phải có ít nhất 1 chứng từ hóa đơn trước khi được duyệt (APPROVED).
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="text"
                                disabled={isBusy}
                                value={initReceiptCode}
                                onChange={(e) => setInitReceiptCode(e.target.value)}
                                placeholder="Mã số hóa đơn (VD: HD-0012)"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                            />
                            <input
                                type="text"
                                disabled={isBusy}
                                value={initReceiptSupplier}
                                onChange={(e) => setInitReceiptSupplier(e.target.value)}
                                placeholder="Tên đơn vị bán..."
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                            />
                        </div>

                        <FileUploader
                            category="RECEIPT"
                            selectedFile={receiptFile}
                            onFileSelect={(file) => {
                                setReceiptFile(file);
                                setScanSuccess(false);
                            }}
                            isUploading={isUploading}
                            progress={progress}
                            error={uploadError}
                            label="Tải lên ảnh/PDF hóa đơn"
                            description="Hỗ trợ JPG, JPEG, PNG, WEBP, PDF (Tối đa 15MB)"
                            disabled={isBusy}
                        />

                        {/* ===== NÚT QUÉT HÓA ĐƠN & KẾT QUẢ ===== */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleScan}
                                    disabled={isBusy || !canScan}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                                >
                                    {isScanning ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ScanLine className="h-3.5 w-3.5" />}
                                    {isScanning ? 'Đang quét...' : 'Quét hóa đơn bằng AI'}
                                </button>
                                {scanSuccess && (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg animate-in fade-in">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Đã quét & điền dữ liệu tự động
                                    </span>
                                )}
                            </div>

                            {scanError && (
                                <div className="flex items-start gap-1.5 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                                    <span>Lỗi quét hóa đơn: {scanError}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700">Ghi chú diễn giải</label>
                        <textarea
                            rows={2}
                            disabled={isBusy}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Chi tiết mua hàng, tình trạng hóa đơn..."
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                        />
                    </div>

                    {/* Calculated total preview */}
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-100">
                        <span className="text-xs font-medium text-slate-500">Tổng tiền thực chi:</span>
                        <span className="text-base font-bold text-slate-900">{formatVND(totalExpense)}</span>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isBusy}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isBusy}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                            {isBusy && <RefreshCw className="h-4 w-4 animate-spin" />}
                            {isUploading ? `Đang tải tệp (${progress}%)...` : isSubmitting ? 'Đang lưu...' : 'Lưu Khoản Chi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};