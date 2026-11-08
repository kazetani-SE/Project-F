import { useState } from 'react';

export function useMutation() {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<unknown>(null);

    async function mutate(action: () => Promise<void>) {
        setBusy(true);
        setError(null);
        try {
            await action();
        } catch (error) {
            setError(error);
        } finally {
            setBusy(false);
        }
    }

    return { busy, error, mutate };
}
