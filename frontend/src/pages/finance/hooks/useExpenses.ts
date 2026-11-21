import { useEffect, useState, useMemo, useCallback } from 'react';
import { financeService } from '../../../services/financeService';
import type {
    Expense,
    BudgetItem,
    CreateExpenseRequest,
    CreateReceiptRequest,
} from '../../../types/models/finance';

export function useExpenses(eventId?: string) {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
            setExpenses(exps ?? []);
            setBudgetItems(bItems ?? []);
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            const msg = errorObj?.message || 'Không thể tải danh sách chi tiêu từ hệ thống.';
            setErrorMessage(msg);
            setExpenses([]);
            setBudgetItems([]);
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
        setIsSubmitting(true);
        try {
            await financeService.createExpense(eventId, data);
            setNotification({ type: 'success', text: 'Tạo khoản chi tiêu thực tế thành công!' });
            await loadData();
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            const msg = errorObj?.message || 'Tạo khoản chi tiêu thất bại.';
            setErrorMessage(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Review / Approve (Mandatory validation spec: Must have at least 1 receipt!)
    const approveExpense = async (exp: Expense) => {
        if (!eventId) return;
        if (!exp.receipts || exp.receipts.length === 0) {
            const err = 'Khoản chi bắt buộc phải có ít nhất 1 chứng từ/hóa đơn trước khi phê duyệt (APPROVED) theo Validation Spec!';
            setErrorMessage(err);
            setNotification({ type: 'error', text: err });
            throw new Error(err);
        }

        setIsSubmitting(true);
        try {
            await financeService.reviewExpense(eventId, exp.id, { status: 'APPROVED' });
            setNotification({ type: 'success', text: `Đã duyệt khoản chi: ${exp.itemName}` });
            await loadData();
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            const msg = errorObj?.message || 'Phê duyệt khoản chi thất bại.';
            setErrorMessage(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const rejectExpense = async (expId: string, rejectionReason: string) => {
        if (!eventId) return;
        setIsSubmitting(true);
        try {
            await financeService.reviewExpense(eventId, expId, {
                status: 'REJECTED',
                rejectionReason,
            });
            setNotification({ type: 'success', text: 'Đã từ chối khoản chi' });
            await loadData();
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            const msg = errorObj?.message || 'Từ chối khoản chi thất bại.';
            setErrorMessage(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const deleteExpense = async (id: string) => {
        if (!eventId) return;
        setIsSubmitting(true);
        try {
            await financeService.deleteExpense(eventId, id);
            setNotification({ type: 'success', text: 'Xóa khoản chi thành công!' });
            await loadData();
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            const msg = errorObj?.message || 'Xóa khoản chi thất bại.';
            setErrorMessage(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Add Receipt
    const addReceipt = async (expenseId: string, data: CreateReceiptRequest) => {
        if (!eventId) return;
        setIsSubmitting(true);
        try {
            await financeService.addReceipt(eventId, expenseId, data);
            setNotification({ type: 'success', text: 'Đính kèm hóa đơn chứng từ thành công!' });
            await loadData();
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            const msg = errorObj?.message || 'Đính kèm chứng từ thất bại.';
            setErrorMessage(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete Receipt
    const deleteReceipt = async (expenseId: string, receiptId: string) => {
        if (!eventId) return;
        setIsSubmitting(true);
        try {
            await financeService.deleteReceipt(eventId, expenseId, receiptId);
            setNotification({ type: 'success', text: 'Xóa hóa đơn chứng từ thành công!' });
            await loadData();
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            const msg = errorObj?.message || 'Xóa chứng từ thất bại.';
            setErrorMessage(msg);
            throw new Error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const clearError = () => setErrorMessage(null);

    return {
        expenses,
        budgetItems,
        filteredExpenses,
        totalSpentSum,
        loading,
        isSubmitting,
        errorMessage,
        clearError,
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
        deleteReceipt,
    };
}
