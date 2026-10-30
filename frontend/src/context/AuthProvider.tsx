import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthContext } from './authContext';
import type {AuthUser} from "../types/models/auth.ts";
import {shellService} from "../services/shellService.ts";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        shellService.getMe()
            .then((u) => !cancelled && setUser(u))
            .catch(() => !cancelled && setUser(null))
            .finally(() => !cancelled && setIsLoading(false));
        return () => { cancelled = true; };
    }, []);

    const value = useMemo(() => ({ user, isLoading }), [user, isLoading]);
    return <AuthContext value={value}>{children}</AuthContext>;
}