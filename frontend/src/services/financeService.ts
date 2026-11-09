import { apiClient } from './apiClient';
import type { ApiResponse } from '../types/common/api';
import type {
    ApprovalStatus,
    AutoProjectBudgetRequest,
    BenchmarkResponse,
    BudgetCategory,
    BudgetItem,
    CreateBenchmarkRequest,
    CreateBudgetCategoryRequest,
    CreateBudgetItemRequest,
    CreateExpenseRequest,
    CreateReceiptRequest,
    EventBudgetSummary,
    Expense,
    ExpenseReceipt,
    ProjectedBudgetItem,
    ReviewBudgetItemRequest,
    ReviewExpenseRequest,
    UpdateBenchmarkRequest,
    UpdateBudgetCategoryRequest,
    UpdateBudgetItemRequest,
    UpdateExpenseRequest,
} from '../types/models/finance';

export const financeService = {
    // --- Danh mục kinh phí ---
    async getCategories(): Promise<BudgetCategory[]> {
        const res = await apiClient.get<ApiResponse<BudgetCategory[]>>('/finance/categories');
        return res.data.data;
    },

    async getCategoryById(id: string): Promise<BudgetCategory> {
        const res = await apiClient.get<ApiResponse<BudgetCategory>>(`/finance/categories/${id}`);
        return res.data.data;
    },

    async createCategory(data: CreateBudgetCategoryRequest): Promise<BudgetCategory> {
        const res = await apiClient.post<ApiResponse<BudgetCategory>>('/finance/categories', data);
        return res.data.data;
    },

    async updateCategory(id: string, data: UpdateBudgetCategoryRequest): Promise<BudgetCategory> {
        const res = await apiClient.put<ApiResponse<BudgetCategory>>(`/finance/categories/${id}`, data);
        return res.data.data;
    },

    async deleteCategory(id: string): Promise<void> {
        await apiClient.delete(`/finance/categories/${id}`);
    },

    // --- Bảng giá tham chiếu thị trường ---
    async getBenchmarks(categoryId?: string, keyword?: string): Promise<BenchmarkResponse[]> {
        const params: Record<string, string> = {};
        if (categoryId) params.categoryId = categoryId;
        if (keyword) params.keyword = keyword;
        const res = await apiClient.get<ApiResponse<BenchmarkResponse[]>>('/finance/benchmarks', { params });
        return res.data.data;
    },

    async getBenchmarkById(id: string): Promise<BenchmarkResponse> {
        const res = await apiClient.get<ApiResponse<BenchmarkResponse>>(`/finance/benchmarks/${id}`);
        return res.data.data;
    },

    async createBenchmark(data: CreateBenchmarkRequest): Promise<BenchmarkResponse> {
        const res = await apiClient.post<ApiResponse<BenchmarkResponse>>('/finance/benchmarks', data);
        return res.data.data;
    },

    async updateBenchmark(id: string, data: UpdateBenchmarkRequest): Promise<BenchmarkResponse> {
        const res = await apiClient.put<ApiResponse<BenchmarkResponse>>(`/finance/benchmarks/${id}`, data);
        return res.data.data;
    },

    async deleteBenchmark(id: string): Promise<void> {
        await apiClient.delete(`/finance/benchmarks/${id}`);
    },

    // --- Dự trù kinh phí chi tiết ---
    async getBudgetItems(eventId: string, status?: ApprovalStatus): Promise<BudgetItem[]> {
        const params: Record<string, string> = { eventId };
        if (status) params.status = status;
        const res = await apiClient.get<ApiResponse<BudgetItem[]>>('/finance/budgets', { params });
        return res.data.data;
    },

    async getBudgetItemById(id: string): Promise<BudgetItem> {
        const res = await apiClient.get<ApiResponse<BudgetItem>>(`/finance/budgets/${id}`);
        return res.data.data;
    },

    async createBudgetItem(data: CreateBudgetItemRequest): Promise<BudgetItem> {
        const res = await apiClient.post<ApiResponse<BudgetItem>>('/finance/budgets', data);
        return res.data.data;
    },

    async updateBudgetItem(id: string, data: UpdateBudgetItemRequest): Promise<BudgetItem> {
        const res = await apiClient.put<ApiResponse<BudgetItem>>(`/finance/budgets/${id}`, data);
        return res.data.data;
    },

    async reviewBudgetItem(id: string, data: ReviewBudgetItemRequest): Promise<BudgetItem> {
        const res = await apiClient.post<ApiResponse<BudgetItem>>(`/finance/budgets/${id}/review`, data);
        return res.data.data;
    },

    async deleteBudgetItem(id: string): Promise<void> {
        await apiClient.delete(`/finance/budgets/${id}`);
    },

    // --- Dự toán tự động từ mùa trước ---
    async getProjectedBudgetPreview(previousEventId: string): Promise<ProjectedBudgetItem[]> {
        const res = await apiClient.get<ApiResponse<ProjectedBudgetItem[]>>('/finance/budgets/projected-preview', {
            params: { previousEventId },
        });
        return res.data.data;
    },

    async autoProjectBudget(data: AutoProjectBudgetRequest): Promise<BudgetItem[]> {
        const res = await apiClient.post<ApiResponse<BudgetItem[]>>('/finance/budgets/project-from-previous', data);
        return res.data.data;
    },

    // --- Chi tiêu thực tế & Duyệt chi ---
    async getExpenses(eventId: string, status?: ApprovalStatus): Promise<Expense[]> {
        const params: Record<string, string> = { eventId };
        if (status) params.status = status;
        const res = await apiClient.get<ApiResponse<Expense[]>>('/finance/expenses', { params });
        return res.data.data;
    },

    async getExpenseById(id: string): Promise<Expense> {
        const res = await apiClient.get<ApiResponse<Expense>>(`/finance/expenses/${id}`);
        return res.data.data;
    },

    async createExpense(data: CreateExpenseRequest): Promise<Expense> {
        const res = await apiClient.post<ApiResponse<Expense>>('/finance/expenses', data);
        return res.data.data;
    },

    async updateExpense(id: string, data: UpdateExpenseRequest): Promise<Expense> {
        const res = await apiClient.put<ApiResponse<Expense>>(`/finance/expenses/${id}`, data);
        return res.data.data;
    },

    async reviewExpense(id: string, data: ReviewExpenseRequest): Promise<Expense> {
        const res = await apiClient.post<ApiResponse<Expense>>(`/finance/expenses/${id}/review`, data);
        return res.data.data;
    },

    async deleteExpense(id: string): Promise<void> {
        await apiClient.delete(`/finance/expenses/${id}`);
    },

    // --- Hóa đơn & Chứng từ ---
    async addReceipt(expenseId: string, data: CreateReceiptRequest): Promise<ExpenseReceipt> {
        const res = await apiClient.post<ApiResponse<ExpenseReceipt>>(`/finance/expenses/${expenseId}/receipts`, data);
        return res.data.data;
    },

    async deleteReceipt(expenseId: string, receiptId: string): Promise<void> {
        await apiClient.delete(`/finance/expenses/${expenseId}/receipts/${receiptId}`);
    },

    // --- Real-time Dashboard Summary ---
    async getBudgetSummary(eventId: string): Promise<EventBudgetSummary> {
        const res = await apiClient.get<ApiResponse<EventBudgetSummary>>(`/finance/summary/${eventId}`);
        return res.data.data;
    },
};

