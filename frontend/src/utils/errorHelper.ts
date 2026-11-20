/**
 * Error Helper Utility
 * Trích xuất chính xác thông điệp lỗi từ Backend ApiError, AxiosError, Error hoặc Error object
 * Đảm bảo không bao giờ nuốt mất message nghiệp vụ từ máy chủ.
 */

export function getErrorMessage(err: unknown, fallback: string = 'Đã có lỗi xảy ra'): string {
    if (!err) return fallback;

    if (typeof err === 'string' && err.trim()) {
        return err.trim();
    }

    if (typeof err === 'object') {
        const obj = err as Record<string, unknown>;

        // 1. Đối tượng AxiosError hoặc API response có response.data.message (ưu tiên cao nhất)
        if (obj.response && typeof obj.response === 'object') {
            const resp = obj.response as Record<string, unknown>;
            if (resp.data && typeof resp.data === 'object') {
                const data = resp.data as Record<string, unknown>;
                if (typeof data.message === 'string' && data.message.trim()) {
                    return data.message.trim();
                }
                if (typeof data.error === 'string' && data.error.trim()) {
                    return data.error.trim();
                }
            }
        }

        // 2. Đối tượng ApiError được reject từ apiClient interceptor hoặc object có message
        if (typeof obj.message === 'string' && obj.message.trim()) {
            return obj.message.trim();
        }

        // 3. Chuỗi error lồng nhau
        if (typeof obj.error === 'string' && obj.error.trim()) {
            return obj.error.trim();
        }
    }

    // 4. Đối tượng Error tiêu chuẩn JavaScript
    if (err instanceof Error && err.message?.trim()) {
        return err.message.trim();
    }

    return fallback;
}
