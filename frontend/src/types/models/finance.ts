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
    curMarketPrice: number;
    currentMarketPrice?: number; // backwards compatibility alias
    supplierName?: string;
    supplierLink?: string;
    supplierReference?: string; // backwards compatibility alias
    lastUpdatedAt?: string;
}

export type BenchmarkResponse = ItemPriceBenchmark;

export interface CreateBenchmarkRequest {
    categoryId: string;
    itemName: string;
    unit: string;
    curMarketPrice: number;
    currentMarketPrice?: number;
    supplierName?: string;
    supplierLink?: string;
    supplierReference?: string;
}

export interface UpdateBenchmarkRequest {
    categoryId: string;
    itemName: string;
    unit: string;
    curMarketPrice: number;
    currentMarketPrice?: number;
    supplierName?: string;
    supplierLink?: string;
    supplierReference?: string;
}

export interface BudgetItemBenchmarkInfo {
    supplierName?: string;
    supplierLink?: string;
    lastUpdatedAt?: string;
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
    estUnitPrice: number;
    estimatedUnitPrice?: number; // backwards compatibility alias
    totalEstAmount?: number;
    totalEstimatedAmount?: number; // backwards compatibility alias
    notes?: string;
    approvalStatus: ApprovalStatus;
    approvedBy?: string;
    approvedAt?: string;
    rejectionReason?: string;
    createdAt?: string;
    benchmark?: BudgetItemBenchmarkInfo | null;
}

export interface CreateBudgetItemRequest {
    categoryId: string;
    benchmarkId?: string;
    mediaAsset?: string;
    itemName: string;
    quantity: number;
    unit: string;
    estUnitPrice: number;
    estimatedUnitPrice?: number;
    notes?: string;
    supplierName?: string;
    supplierLink?: string;
}

export interface UpdateBudgetItemRequest {
    categoryId: string;
    benchmarkId?: string;
    mediaAsset?: string;
    itemName: string;
    quantity: number;
    unit: string;
    estUnitPrice: number;
    estimatedUnitPrice?: number;
    notes?: string;
    supplierName?: string;
    supplierLink?: string;
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

export interface LinkedBudgetItem {
    id: string;
    itemName: string;
    unit: string;
    quantity: number;
    estUnitPrice: number;
    estTotal: number;
    approvalStatus: ApprovalStatus;
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
    budgetItem?: LinkedBudgetItem | null;
}

export interface CreateExpenseRequest {
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
    totalBudgetEst: number;
    totalBudgetEstimated?: number; // alias
    totalActualSpent: number;
    remainingFund: number;
    remainingAllocatedFund?: number; // alias
    estimateVariance: number;
    varianceAgainstEstimate?: number; // alias
}

export interface ProjectedBudgetItem {
    prevBudgetItemId?: string;
    previousBudgetItemId?: string; // alias
    previousEventId: string;
    categoryId: string;
    benchmarkId?: string;
    itemName: string;
    unit: string;
    prevPlannedQty?: number;
    previousPlannedQty?: number; // alias
    baseProjectionQty?: number;
    baseQuantityForProjection?: number; // alias
    previousUnitPrice: number;
    adjustedUnitPrice?: number;
    currentAdjustedUnitPrice?: number; // alias
    projectedCost?: number;
    projectedCurrentCost?: number; // alias
}

export interface AutoProjectBudgetRequest {
    previousEventId: string;
    cateReplacements?: CategoryReplacementRequest[];
}

// --- Category replacement (auto-projection flow) ---
export interface CategoryReplacementRequest {
    oldCategoryId: string;
    newCategoryId: string;
}

export interface CategoryReplacementOptionsRequest {
    deletedCateIds: string[];
}

export interface CategoryReplacementOptionsResponse {
    deletedCategories: BudgetCategory[];
    activeCategories: BudgetCategory[];
}

// --- AI: Benchmark research ---
export interface BenchmarkAiResearchRequest {
    itemName: string;
    unit: string;
    locationContext?: string;
}

export interface BenchmarkAiSuggestionResponse {
    itemName: string;
    unit: string;
    estUnitPrice: number;
    supplierName?: string;
    supplierLink?: string;
    referenceNote?: string;
}

// --- AI: Bill scan ---
export interface BillScanItem {
    name: string;
    quantity: number;
    unitPrice: number;
    amount: number;
}

export interface BillScanResponse {
    storeName: string | null;
    billDate: string | null; // yyyy-MM-dd
    receiptCode: string | null;
    itemName: string | null;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    notes: string | null;
}

// --- AI: Gemini ping ---
export interface GeminiPingResponse {
    [key: string]: unknown;
}
