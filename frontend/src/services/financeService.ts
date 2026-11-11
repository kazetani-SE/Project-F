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

const DEFAULT_EVENT_ID = '00000000-0000-0000-0000-000000000000';

function getFinanceBase(eventId?: string): string {
    return `/events/${eventId || DEFAULT_EVENT_ID}/finance`;
}

export const financeService = {
    // --- Danh mục kinh phí ---
    async getCategories(eventId?: string): Promise<BudgetCategory[]> {
        const res = await apiClient.get<ApiResponse<BudgetCategory[]>>(`${getFinanceBase(eventId)}/categories`);
        return res.data.data;
    },

    async getCategoryById(id: string, eventId?: string): Promise<BudgetCategory> {
        const res = await apiClient.get<ApiResponse<BudgetCategory>>(`${getFinanceBase(eventId)}/categories/${id}`);
        return res.data.data;
    },

    async createCategory(data: CreateBudgetCategoryRequest, eventId?: string): Promise<BudgetCategory> {
        const res = await apiClient.post<ApiResponse<BudgetCategory>>(`${getFinanceBase(eventId)}/categories`, data);
        return res.data.data;
    },

    async updateCategory(id: string, data: UpdateBudgetCategoryRequest, eventId?: string): Promise<BudgetCategory> {
        const res = await apiClient.put<ApiResponse<BudgetCategory>>(`${getFinanceBase(eventId)}/categories/${id}`, data);
        return res.data.data;
    },

    async deleteCategory(id: string, eventId?: string): Promise<void> {
        await apiClient.delete(`${getFinanceBase(eventId)}/categories/${id}`);
    },

    // --- Bảng giá tham chiếu thị trường ---
    async getBenchmarks(categoryId?: string, keyword?: string, eventId?: string): Promise<BenchmarkResponse[]> {
        const params: Record<string, string> = {};
        if (categoryId) params.categoryId = categoryId;
        if (keyword) params.keyword = keyword;
        const res = await apiClient.get<ApiResponse<BenchmarkResponse[]>>(`${getFinanceBase(eventId)}/benchmarks`, { params });
        return res.data.data;
    },

    async getBenchmarkById(id: string, eventId?: string): Promise<BenchmarkResponse> {
        const res = await apiClient.get<ApiResponse<BenchmarkResponse>>(`${getFinanceBase(eventId)}/benchmarks/${id}`);
        return res.data.data;
    },

    async createBenchmark(data: CreateBenchmarkRequest, eventId?: string): Promise<BenchmarkResponse> {
        const res = await apiClient.post<ApiResponse<BenchmarkResponse>>(`${getFinanceBase(eventId)}/benchmarks`, data);
        return res.data.data;
    },

    async updateBenchmark(id: string, data: UpdateBenchmarkRequest, eventId?: string): Promise<BenchmarkResponse> {
        const res = await apiClient.put<ApiResponse<BenchmarkResponse>>(`${getFinanceBase(eventId)}/benchmarks/${id}`, data);
        return res.data.data;
    },

    async deleteBenchmark(id: string, eventId?: string): Promise<void> {
        await apiClient.delete(`${getFinanceBase(eventId)}/benchmarks/${id}`);
    },

    // --- Dự trù kinh phí chi tiết ---
    async getBudgetItems(eventId: string, status?: ApprovalStatus): Promise<BudgetItem[]> {
        const params: Record<string, string> = {};
        if (status) params.status = status;
        const res = await apiClient.get<ApiResponse<BudgetItem[]>>(`${getFinanceBase(eventId)}/budgets`, { params });
        return res.data.data;
    },

    async getBudgetItemById(eventId: string, id: string): Promise<BudgetItem> {
        const res = await apiClient.get<ApiResponse<BudgetItem>>(`${getFinanceBase(eventId)}/budgets/${id}`);
        return res.data.data;
    },

    async createBudgetItem(eventId: string, data: CreateBudgetItemRequest): Promise<BudgetItem> {
        const res = await apiClient.post<ApiResponse<BudgetItem>>(`${getFinanceBase(eventId)}/budgets`, data);
        return res.data.data;
    },

    async updateBudgetItem(eventId: string, id: string, data: UpdateBudgetItemRequest): Promise<BudgetItem> {
        const res = await apiClient.put<ApiResponse<BudgetItem>>(`${getFinanceBase(eventId)}/budgets/${id}`, data);
        return res.data.data;
    },

    async reviewBudgetItem(eventId: string, id: string, data: ReviewBudgetItemRequest): Promise<BudgetItem> {
        const res = await apiClient.post<ApiResponse<BudgetItem>>(`${getFinanceBase(eventId)}/budgets/${id}/review`, data);
        return res.data.data;
    },

    async deleteBudgetItem(eventId: string, id: string): Promise<void> {
        await apiClient.delete(`${getFinanceBase(eventId)}/budgets/${id}`);
    },

    // --- Dự toán tự động từ mùa trước ---
    async getProjectedBudgetPreview(eventId: string, previousEventId: string): Promise<ProjectedBudgetItem[]> {
        const res = await apiClient.get<ApiResponse<ProjectedBudgetItem[]>>(`${getFinanceBase(eventId)}/budgets/projected-preview`, {
            params: { previousEventId },
        });
        return res.data.data;
    },

    async autoProjectBudget(eventId: string, data: AutoProjectBudgetRequest): Promise<BudgetItem[]> {
        const res = await apiClient.post<ApiResponse<BudgetItem[]>>(`${getFinanceBase(eventId)}/budgets/project-from-previous`, data);
        return res.data.data;
    },

    // --- Chi tiêu thực tế & Duyệt chi ---
    async getExpenses(eventId: string, status?: ApprovalStatus): Promise<Expense[]> {
        const params: Record<string, string> = {};
        if (status) params.status = status;
        const res = await apiClient.get<ApiResponse<Expense[]>>(`${getFinanceBase(eventId)}/expenses`, { params });
        return res.data.data;
    },

    async getExpenseById(eventId: string, id: string): Promise<Expense> {
        const res = await apiClient.get<ApiResponse<Expense>>(`${getFinanceBase(eventId)}/expenses/${id}`);
        return res.data.data;
    },

    async createExpense(eventId: string, data: CreateExpenseRequest): Promise<Expense> {
        const res = await apiClient.post<ApiResponse<Expense>>(`${getFinanceBase(eventId)}/expenses`, data);
        return res.data.data;
    },

    async updateExpense(eventId: string, id: string, data: UpdateExpenseRequest): Promise<Expense> {
        const res = await apiClient.put<ApiResponse<Expense>>(`${getFinanceBase(eventId)}/expenses/${id}`, data);
        return res.data.data;
    },

    async reviewExpense(eventId: string, id: string, data: ReviewExpenseRequest): Promise<Expense> {
        const res = await apiClient.post<ApiResponse<Expense>>(`${getFinanceBase(eventId)}/expenses/${id}/review`, data);
        return res.data.data;
    },

    async deleteExpense(eventId: string, id: string): Promise<void> {
        await apiClient.delete(`${getFinanceBase(eventId)}/expenses/${id}`);
    },

    // --- Hóa đơn & Chứng từ ---
    async addReceipt(eventId: string, expenseId: string, data: CreateReceiptRequest): Promise<ExpenseReceipt> {
        const res = await apiClient.post<ApiResponse<ExpenseReceipt>>(`${getFinanceBase(eventId)}/expenses/${expenseId}/receipts`, data);
        return res.data.data;
    },

    async deleteReceipt(eventId: string, expenseId: string, receiptId: string): Promise<void> {
        await apiClient.delete(`${getFinanceBase(eventId)}/expenses/${expenseId}/receipts/${receiptId}`);
    },

    // --- Real-time Dashboard Summary ---
    async getBudgetSummary(eventId: string): Promise<EventBudgetSummary> {
        const res = await apiClient.get<ApiResponse<EventBudgetSummary>>(`${getFinanceBase(eventId)}/summary`);
        return res.data.data;
    },
};
