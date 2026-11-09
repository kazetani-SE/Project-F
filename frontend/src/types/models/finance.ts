export type ApprovalStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface BudgetCategory {
    id: string;
    name: string;
    description?: string;
}

export interface CreateBudgetCategoryRequest {
    name: string;
    description?: string;
}

export interface UpdateBudgetCategoryRequest {
    name: string;
    description?: string;
}

export interface ItemPriceBenchmark {
    id: string;
    categoryId: string;
    itemName: string;
    unit: string;
    currentMarketPrice: number;
    supplierReference?: string;
    lastUpdatedAt?: string;
}

export type BenchmarkResponse = ItemPriceBenchmark;

export interface CreateBenchmarkRequest {
    categoryId: string;
    itemName: string;
    unit: string;
    currentMarketPrice: number;
    supplierReference?: string;
}

export interface UpdateBenchmarkRequest {
    categoryId: string;
    itemName: string;
    unit: string;
    currentMarketPrice: number;
    supplierReference?: string;
}

export interface BudgetItem {
    id: string;
    eventId: string;
    categoryId: string;
    benchmarkId?: string;
    mediaAsset?: string;
    itemName: string;
    quantity: number;
    unit: string;
    estimatedUnitPrice: number;
    totalEstimatedAmount?: number;
    notes?: string;
    approvalStatus: ApprovalStatus;
    approvedBy?: string;
    approvedAt?: string;
    rejectionReason?: string;
    createdAt?: string;
}

export interface CreateBudgetItemRequest {
    eventId: string;
    categoryId: string;
    benchmarkId?: string;
    mediaAsset?: string;
    itemName: string;
    quantity: number;
    unit: string;
    estimatedUnitPrice: number;
    notes?: string;
}

export interface UpdateBudgetItemRequest {
    categoryId: string;
    benchmarkId?: string;
    mediaAsset?: string;
    itemName: string;
    quantity: number;
    unit: string;
    estimatedUnitPrice: number;
    notes?: string;
}

export interface ReviewBudgetItemRequest {
    status: ApprovalStatus;
    approvedBy?: string;
    rejectionReason?: string;
}

export interface ExpenseReceipt {
    id: string;
    expenseId: string;
    receiptCode?: string;
    imageUrl: string;
    supplierName?: string;
    createdAt?: string;
}

export interface CreateReceiptRequest {
    receiptCode?: string;
    imageUrl: string;
    supplierName?: string;
}

export interface Expense {
    id: string;
    eventId: string;
    budgetItemId?: string;
    itemName: string;
    quantity: number;
    actualUnitPrice: number;
    totalAmount?: number;
    paidBy: string;
    status: ApprovalStatus;
    approvedBy?: string;
    approvedAt?: string;
    rejectionReason?: string;
    paymentDate: string;
    notes?: string;
    createdAt?: string;
    receipts?: ExpenseReceipt[];
}

export interface CreateExpenseRequest {
    eventId: string;
    budgetItemId?: string;
    itemName: string;
    quantity: number;
    actualUnitPrice: number;
    paidBy: string;
    paymentDate: string;
    notes?: string;
    receipts?: CreateReceiptRequest[];
}

export interface UpdateExpenseRequest {
    budgetItemId?: string;
    itemName: string;
    quantity: number;
    actualUnitPrice: number;
    paidBy: string;
    paymentDate: string;
    notes?: string;
}

export interface ReviewExpenseRequest {
    status: ApprovalStatus;
    approvedBy?: string;
    rejectionReason?: string;
}

export interface EventBudgetSummary {
    eventId: string;
    eventTitle: string;
    seasonName: string;
    allocatedFund: number;
    totalBudgetEstimated: number;
    totalActualSpent: number;
    remainingAllocatedFund: number;
    varianceAgainstEstimate: number;
}

export interface ProjectedBudgetItem {
    previousBudgetItemId: string;
    previousEventId: string;
    categoryId: string;
    benchmarkId?: string;
    itemName: string;
    unit: string;
    previousPlannedQty: number;
    baseQuantityForProjection: number;
    previousUnitPrice: number;
    currentAdjustedUnitPrice: number;
    projectedCurrentCost: number;
}

export interface AutoProjectBudgetRequest {
    targetEventId: string;
    previousEventId: string;
}
