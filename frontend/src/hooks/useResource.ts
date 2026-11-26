import { useEffect, useRef, useState } from 'react';
import type { ApiError } from '../types/common/api';

export function useResource<T>(load: () => Promise<T>) {
    const [result, setResult] = useState<{ source: typeof load; data?: T; error?: ApiError }>();
    const [attempt, setAttempt] = useState(0);
    const pending = useRef<{ source: typeof load; attempt: number; promise: Promise<T> }>(null);

    useEffect(() => {
        let active = true;
        let request = pending.current;
        if (!request || request.source !== load || request.attempt !== attempt) {
            // StrictMode chạy lại Effect khi dev; dùng chung request đang chờ nhưng Retry vẫn tạo request mới.
            request = { source: load, attempt, promise: load() };
            pending.current = request;
            const created = request;
            const clear = () => { if (pending.current === created) pending.current = null; };
            void created.promise.then(clear, clear);
        }
        request.promise
            .then((data) => { if (active) setResult({ source: load, data }); })
            .catch((error: ApiError) => { if (active) setResult({ source: load, error }); });
        return () => { active = false; };
    }, [load, attempt]);

    const current = result?.source === load ? result : undefined;
    return {
        data: current?.data,
        error: current?.error,
        isLoading: !current,
        replace: (data: T) => setResult({ source: load, data }),
        reload: () => { setResult(undefined); setAttempt((value) => value + 1); },
    };
}
