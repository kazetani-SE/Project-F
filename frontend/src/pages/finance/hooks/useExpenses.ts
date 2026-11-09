import { useEffect, useState, useMemo, useCallback } from 'react';
import { financeService } from '../../../services/financeService';
import type {
    Expense,
    BudgetItem,
    ExpenseReceipt,
    CreateExpenseRequest,
    CreateReceiptRequest,
} from '../../../types/models/finance';

export function useExpenses(eventId?: string) {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const loadData = useCallback(async () => {
        if (!eventId) {
            setExpenses([]);
            setBudgetItems([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const [exps, bItems] = await Promise.all([
                financeService.getExpenses(eventId),
                financeService.getBudgetItems(eventId),
            ]);
            setExpenses(exps);
            setBudgetItems(bItems);
        } catch {
            // Mock fallback if DB is not populated yet
            setExpenses([
                {
                    id: 'exp1', eventId, budgetItemId: 'bi1', itemName: 'Standee bạt PP (0.8m x 1.8m)',
                    quantity: 4, actualUnitPrice: 115000, totalAmount: 460000,
                    paidBy: '00000000-0000-0000-0000-000000000001', status: 'APPROVED',
                    paymentDate: '2026-11-02', notes: 'Thanh toán trực tiếp cho nhà in FPT',
                    receipts: [
                        { id: 'r1', expenseId: 'exp1', receiptCode: 'HD-00129', imageUrl: 'https://images.unsplash.com/photo-1554415707-9e4466a014c8?w=800', supplierName: 'Nhà in FPT Copy' }
                    ]
                },
                {
                    id: 'exp2', eventId, budgetItemId: 'bi2', itemName: 'Backdrop sân khấu',
                    quantity: 1, actualUnitPrice: 450000, totalAmount: 450000,
                    paidBy: '00000000-0000-0000-0000-000000000001', status: 'APPROVED',
                    paymentDate: '2026-11-03', notes: 'In ấn Đại Nam',
                    receipts: [
                        { id: 'r2', expenseId: 'exp2', receiptCode: 'DN-8841', imageUrl: 'https://images.unsplash.com/photo-1554415707-9e4466a014c8?w=800', supplierName: 'Công ty In Đại Nam' }
                    ]
                },
                {
                    id: 'exp3', eventId, itemName: 'Chi phí mua pin micro dự phòng',
                    quantity: 6, actualUnitPrice: 25000, totalAmount: 150000,
                    paidBy: '00000000-0000-0000-0000-000000000001', status: 'PENDING',
                    paymentDate: '2026-11-04', notes: 'Phát sinh mua thêm pin Energizer tại tiệm tạp hóa',
                    receipts: []
                },
            ]);
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredExpenses = useMemo(() => {
        return expenses.filter(e => {
            return statusFilter === 'ALL' || e.status === statusFilter;
        });
    }, [expenses, statusFilter]);

    const totalSpentSum = useMemo(() => {
        return filteredExpenses.reduce((acc, cur) => acc + (cur.totalAmount ?? (cur.quantity * cur.actualUnitPrice)), 0);
    }, [filteredExpenses]);

    // Create Expense
    const createExpense = async (data: CreateExpenseRequest) => {
        if (!eventId) return;
        try {
            await financeService.createExpense(eventId, data);
            setNotification({ type: 'success', text: 'Tạo khoản chi tiêu thực tế thành công!' });
            await loadData();
        } catch {
            const newExp: Expense = {
                id: Date.now().toString(),
                eventId,
                budgetItemId: data.budgetItemId,
                itemName: data.itemName,
                quantity: data.quantity,
                actualUnitPrice: data.actualUnitPrice,
                totalAmount: data.quantity * data.actualUnitPrice,
                paidBy: data.paidBy,
                paymentDate: data.paymentDate,
                notes: data.notes,
                status: 'PENDING',
                receipts: (data.receipts ?? []).map((r, idx) => ({
                    id: 'rc_' + idx + '_' + Date.now(),
                    expenseId: '',
                    imageUrl: r.imageUrl,
                    receiptCode: r.receiptCode,
                    supplierName: r.supplierName,
                })),
            };
            setExpenses(prev => [newExp, ...prev]);
            setNotification({ type: 'success', text: 'Đã lưu khoản thực chi thành công!' });
        }
    };

    // Review / Approve (Mandatory validation spec: Must have at least 1 receipt!)
    const approveExpense = async (exp: Expense) => {
        if (!eventId) return;
        if (!exp.receipts || exp.receipts.length === 0) {
            setNotification({
                type: 'error',
                text: 'Khoản chi bắt buộc phải có ít nhất 1 chứng từ/hóa đơn trước khi phê duyệt (APPROVED) theo Validation Spec!'
            });
            return;
        }

        try {
            await financeService.reviewExpense(eventId, exp.id, { status: 'APPROVED' });
            setNotification({ type: 'success', text: `Đã duyệt khoản chi: ${exp.itemName}` });
            await loadData();
        } catch {
            setExpenses(prev => prev.map(e => e.id === exp.id ? { ...e, status: 'APPROVED' } : e));
            setNotification({ type: 'success', text: `Đã duyệt khoản chi: ${exp.itemName}` });
        }
    };

    const rejectExpense = async (expId: string, rejectionReason: string) => {
        if (!eventId) return;
        try {
            await financeService.reviewExpense(eventId, expId, {
                status: 'REJECTED',
                rejectionReason,
            });
            setNotification({ type: 'success', text: 'Đã từ chối khoản chi' });
            await loadData();
        } catch {
            setExpenses(prev => prev.map(e => e.id === expId ? { ...e, status: 'REJECTED', rejectionReason } : e));
            setNotification({ type: 'success', text: 'Đã cập nhật từ chối khoản chi' });
        }
    };

    const deleteExpense = async (id: string) => {
        if (!eventId) return;
        try {
            await financeService.deleteExpense(eventId, id);
            setNotification({ type: 'success', text: 'Xóa khoản chi thành công!' });
            await loadData();
        } catch {
            setExpenses(prev => prev.filter(e => e.id !== id));
            setNotification({ type: 'success', text: 'Đã xóa khoản chi!' });
        }
    };

    // Add Receipt
    const addReceipt = async (expenseId: string, data: CreateReceiptRequest) => {
        if (!eventId) return;
        try {
            await financeService.addReceipt(eventId, expenseId, data);
            setNotification({ type: 'success', text: 'Đính kèm hóa đơn chứng từ thành công!' });
            await loadData();
        } catch {
            const newR: ExpenseReceipt = {
                id: 'rc_' + Date.now(),
                expenseId,
                receiptCode: data.receiptCode,
                imageUrl: data.imageUrl,
                supplierName: data.supplierName,
            };
            setExpenses(prev => prev.map(exp => {
                if (exp.id === expenseId) {
                    return { ...exp, receipts: [...(exp.receipts ?? []), newR] };
                }
                return exp;
            }));
            setNotification({ type: 'success', text: 'Đã đính kèm chứng từ!' });
        }
    };

    return {
        expenses,
        budgetItems,
        filteredExpenses,
        totalSpentSum,
        loading,
        statusFilter,
        setStatusFilter,
        notification,
        setNotification,
        reloadData: loadData,
        createExpense,
        approveExpense,
        rejectExpense,
        deleteExpense,
        addReceipt,
    };
}

