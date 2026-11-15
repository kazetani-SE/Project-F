export interface ApiResponse<T> { success: boolean; data: T; message?: string }
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
