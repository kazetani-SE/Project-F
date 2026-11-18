import { useEffect, useState } from 'react';
import type { ApiError } from '../types/common/api';

export function useResource<T>(load: () => Promise<T>) {
    const [result, setResult] = useState<{ source: typeof load; data?: T; error?: ApiError }>();
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let active = true;
        load()
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
