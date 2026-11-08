import { useEffect, useState, type ReactNode } from 'react';
import { AuthContext } from './authContext';
import { setAccessToken } from '../services/apiClient';
import { requireSupabase, supabase, useMock } from '../services/supabaseClient';
import { shellService } from '../services/shellService';
import type { ApiError } from '../types/common/api';
import type { AuthUser } from '../types/models/auth';

const MOCK_SIGNED_OUT = 'pf.mockSignedOut';
const RECOVERY_USER = 'pf.recoveryUser';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [mockSignedIn, setMockSignedIn] = useState(
        () => useMock && sessionStorage.getItem(MOCK_SIGNED_OUT) !== 'true',
    );
    const [account, setAccount] = useState<string | null | undefined>(supabase ? undefined : null);
    const [recovery, setRecovery] = useState(false);
    const [profile, setProfile] = useState<{ account: string; user?: AuthUser; error?: ApiError }>();
    const [attempt, setAttempt] = useState(0);
    const currentAccount = useMock ? (mockSignedIn ? 'mock' : null) : account;

    useEffect(() => {
        if (!supabase) return;
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            const id = session?.user.id ?? null;
            setAccessToken(session?.access_token ?? null);
            if (event === 'PASSWORD_RECOVERY' && id) sessionStorage.setItem(RECOVERY_USER, id);
            if (!id) sessionStorage.removeItem(RECOVERY_USER);
            const recovering = id !== null && sessionStorage.getItem(RECOVERY_USER) === id;
            if (!id || recovering) setProfile(undefined);
            setRecovery(recovering);
            setAccount(id);
        });
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!currentAccount || recovery) return;
        let current = true;
        shellService.getMe()
            .then((user) => { if (current) setProfile({ account: currentAccount, user }); })
            .catch((error: ApiError) => { if (current) setProfile({ account: currentAccount, error }); });
        return () => { current = false; };
    }, [attempt, currentAccount, recovery]);

    async function signIn(email: string, password: string) {
        if (useMock) {
            sessionStorage.removeItem(MOCK_SIGNED_OUT);
            setMockSignedIn(true);
            return;
        }
        const { error } = await requireSupabase().auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (profile?.error) {
            setProfile(undefined);
            setAttempt((value) => value + 1);
        }
    }

    async function signOut() {
        if (useMock) {
            sessionStorage.setItem(MOCK_SIGNED_OUT, 'true');
            setMockSignedIn(false);
            setProfile(undefined);
            return;
        }
        const { error } = await requireSupabase().auth.signOut({ scope: 'local' });
        if (error) throw error;
    }

    async function sendReset(email: string) {
        const redirectTo = new URL('/reset-password', window.location.origin).href;
        const { error } = await requireSupabase().auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
    }

    async function updatePassword(password: string) {
        if (!recovery) throw new Error('Liên kết đặt lại mật khẩu không hợp lệ.');
        const { error } = await requireSupabase().auth.updateUser({ password });
        if (error) throw error;
        await signOut();
    }

    const loaded = profile?.account === currentAccount ? profile : undefined;
    return <AuthContext value={{
        user: loaded?.user ?? null,
        error: loaded?.error ?? null,
        isLoading: currentAccount === undefined || Boolean(currentAccount && !recovery && !loaded),
        recovery,
        signIn, signOut, sendReset, updatePassword,
        retry: () => { setProfile(undefined); setAttempt((value) => value + 1); },
    }}>{children}</AuthContext>;
}
