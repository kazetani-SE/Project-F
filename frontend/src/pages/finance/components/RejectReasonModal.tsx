import React, { useState } from 'react';
import { X } from 'lucide-react';

interface RejectReasonModalProps {
    isOpen: boolean;
    title: string;
    itemDescription?: string;
    onClose: () => void;
    onConfirm: (reason: string) => void;
}

export const RejectReasonModal: React.FC<RejectReasonModalProps> = ({
    isOpen,
    title,
    itemDescription,
    onClose,
    onConfirm,
}) => {
    const [reason, setReason] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) return;
        onConfirm(reason.trim());
        setReason('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                    <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {itemDescription && (
                    <p className="mt-1 text-xs text-slate-500">{itemDescription}</p>
                )}

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700">Lý do từ chối *</label>
                        <textarea
                            required
                            rows={3}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Nhập lý do chi tiết để phản hồi lại cho người lập..."
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                        >
                            Xác Nhận Từ Chối
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

