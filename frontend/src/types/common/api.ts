export interface ErrorDetail { field: string; rejectedValue?: unknown; message: string }
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    errorCode?: string | null;
    timestamp?: string;
    errorDetails?: ErrorDetail[] | null;
}
export interface ApiError { status?: number; errorCode?: string; message: string }

export interface PageResponse<T> {
    items: T[];
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
    isFirst: boolean;
    isLast: boolean;
    hasNext: boolean;
}
