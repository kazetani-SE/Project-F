export interface ApiResponse<T> { success: boolean; data: T; message?: string }
export interface ApiError { status?: number; errorCode?: string; message: string }

export interface PageResponse<T> {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
}
