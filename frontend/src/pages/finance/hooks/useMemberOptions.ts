import { useEffect, useState } from 'react';
import { memberService } from '../../../services/memberService';
import type { MemberQuery } from '../../../types/models/member';

export interface MemberOption {
    id: string;
    label: string;
}

export function useMemberOptions(enabled: boolean) {
    const [options, setOptions] = useState<MemberOption[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!enabled || options.length > 0) return;
        let cancelled = false;

        (async () => {
            setIsLoading(true);
            setError(null);
            try {
                // TODO: đổi sang API member theo event khi backend có
                const page = await memberService.list({ page: 0, size: 200 } as MemberQuery);
                if (cancelled) return;
                setOptions(
                    page.items.map((m) => ({
                        id: m.id,
                        label: m.fullName || m.email || m.id,
                    })),
                );
            } catch {
                if (!cancelled) setError('Không tải được danh sách thành viên');
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [enabled, options.length]);

    return { options, isLoading, error };
}