export interface ApiResponse<T> { success: boolean; data: T; message?: string }
export interface ApiError { status?: number; errorCode?: string; message: string }