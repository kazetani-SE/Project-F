import { useCallback, useState } from 'react';
import type { BillScanResponse } from '../../../types/models/finance';
import { financeService } from '../../../services/financeService';

export function useBillScan(eventId: string) {
    const [isScanning, setIsScanning] = useState(false);
    const [rawResult, setRawResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const scan = useCallback(
        async (file: File): Promise<BillScanResponse | null> => {
            setIsScanning(true);
            setError(null);
            setRawResult(null);
            try {
                const res = await financeService.scanBill(eventId, file);
                setRawResult(JSON.stringify(res, null, 2));
                return res;
            } catch (err: unknown) {
                const data = (err as { response?: { data?: unknown } })?.response?.data;
                setError(
                    data ? JSON.stringify(data, null, 2) : err instanceof Error ? err.message : 'Quét hóa đơn thất bại',
                );
                return null;
            } finally {
                setIsScanning(false);
            }
        },
        [eventId],
    );

    const reset = useCallback(() => {
        setRawResult(null);
        setError(null);
    }, []);

    return { isScanning, rawResult, error, scan, reset };
}